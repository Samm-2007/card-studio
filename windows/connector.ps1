$ErrorActionPreference = 'Stop'
$config = '__CONFIG__' | ConvertFrom-Json
Write-Host 'Card Studio Connector v3 - validated multi-track input'
Write-Host 'Server:' $config.url
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Printing;
using System.Runtime.InteropServices;
public static class CardStudioPrint {
 [DllImport("gdi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
 static extern bool TextOut(IntPtr dc, int x, int y, string text, int length);
 public static void Send(PrintDocument doc, byte[] bytes, string[] commands) {
  using(var stream = new System.IO.MemoryStream(bytes))
  using(var image = Image.FromStream(stream)) {
   doc.DocumentName = "Card Studio - one card";
   doc.PrinterSettings.Copies = 1;
   doc.DefaultPageSettings.Landscape = image.Width > image.Height;
   var paper = doc.DefaultPageSettings.PaperSize;
   if (Math.Abs(Math.Min(paper.Width,paper.Height)-213)>5 || Math.Abs(Math.Max(paper.Width,paper.Height)-337)>5)
    throw new Exception("Select CR80 (85.6 x 54 mm) paper in printer Properties before connecting.");
   doc.PrintController = new StandardPrintController();
   PrintPageEventHandler handler = (s,e) => {
    // Driver must intercept this native text as Track 2, rather than print it.
    var bounds = e.PageBounds;
    e.Graphics.TranslateTransform(-e.PageSettings.HardMarginX, -e.PageSettings.HardMarginY);
    e.Graphics.DrawImage(image, 0, 0, bounds.Width, bounds.Height);

    IntPtr dc = e.Graphics.GetHdc();
    try { for (int i=0; i<commands.Length; i++) { string command=commands[i]; if(!TextOut(dc, 10, 10+i*40, command, command.Length)) throw new Exception("GDI TextOut failed"); } }
    finally { e.Graphics.ReleaseHdc(dc); }
    e.HasMorePages = false;
   };
   doc.PrintPage += handler;
   try { doc.Print(); } finally { doc.PrintPage -= handler; }
  }
 }
}
'@
$headers = @{'X-Windows-Bridge-Key'=$config.key; Authorization=('Basic '+[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('cardstudio:'+$config.password)))}
$id = [Guid]::NewGuid().ToString()
$doc = New-Object Drawing.Printing.PrintDocument
$dialog = New-Object Windows.Forms.PrintDialog
$dialog.Document = $doc
$dialog.UseEXDialog = $true
[Windows.Forms.MessageBox]::Show('Select your HiTi CS-200e. In Properties configure CR80, single side, correct ribbon and magnetic encoder. Encoding by text data: enabled. Prefix filter: ~  Suffix filter: | (Track 2 marker is 2). Clear fixed manual Track 2 data. . A magnetic encoder module is required. Test on one blank membership card first.','Card Studio') | Out-Null
if ($dialog.ShowDialog() -ne 'OK') { exit }
if ($doc.PrinterSettings.PrinterName -notmatch 'CS[ _-]?200e') { throw 'Select a HiTi CS-200e printer.' }
Write-Host 'Connected printer:' $doc.PrinterSettings.PrinterName
Write-Host 'Keep this window open. Close it to disconnect. No automatic retries.'
while ($true) {
 try {
  $body = @{id=$id;machine=$env:COMPUTERNAME;printer=$doc.PrinterSettings.PrinterName} | ConvertTo-Json -Compress
  $response = Invoke-RestMethod -Uri ($config.url+'/api/windows/poll') -Method Post -Headers $headers -Body $body -ContentType 'application/json' -TimeoutSec 10
  if ($response.job) {
   $job = $response.job
   $ok = $false
   $message = 'Operator canceled; not sent.'
   try {
    if (-not $job.commands -or $job.commands.Count -gt 3) { throw 'Invalid magnetic commands. Download connector v3.' }
    foreach ($command in $job.commands) {
     if ($command -notmatch '^~[123][\x20-\x5F]{1,104}\|$') { throw 'Invalid native command.' }
    }
    $choice = [Windows.Forms.MessageBox]::Show(('Print ONE card with these magnetic commands?'+"`n"+($job.commands -join "`n")+"`nVerify with a magnetic reader after printing."),'Confirm card','YesNo','Warning')
    if ($choice -eq 'Yes') {
     $bytes = [Convert]::FromBase64String(($job.image -split ',',2)[1])
     [CardStudioPrint]::Send($doc, $bytes, [string[]]$job.commands)
     $ok = $true; $message = 'Submitted to Windows driver; verify magnetic readback.'
    }
   } catch { $message = 'Print outcome may be unknown. Check Windows queue before retrying. '+$_.Exception.Message }
   $result = @{id=$id;jobId=$job.id;ok=$ok;message=$message.Substring(0,[Math]::Min(500,$message.Length))} | ConvertTo-Json -Compress
   try { Invoke-RestMethod -Uri ($config.url+'/api/windows/result') -Method Post -Headers $headers -Body $result -ContentType 'application/json' -TimeoutSec 10 | Out-Null }
   catch { Write-Warning 'Result not delivered. Do not resubmit; check printer and website. Restart server only after resolving this card.' }
   $job=$null; $bytes=$null
  }
 } catch {
  $detail = $_.Exception.Message
  if ($_.ErrorDetails.Message) { $detail += ' ' + $_.ErrorDetails.Message }
  try {
   if ($_.Exception.Response) {
    $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
    $detail += ' ' + $reader.ReadToEnd(); $reader.Dispose()
   }
  } catch {}
  Write-Warning $detail
  if ($detail -match '401|403') {
   Write-Host 'Connection refused. Download a NEW connector from the current site. Run the newest downloaded file, including (1)/(2) if present.' -ForegroundColor Yellow
   Read-Host 'Press Enter to close'; exit 1
  }
 }
 Start-Sleep -Seconds 2
}
