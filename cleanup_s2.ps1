$file = 'c:\Users\วิทยาศาสตร์\Documents\test ui openclaw\src\StageTools.jsx'
$lines = Get-Content $file
$out = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
  $n = $i + 1
  if ($n -ge 332 -and $n -le 379) { continue }
  $out += $lines[$i]
}
$out | Set-Content $file -Encoding UTF8
Write-Host "Done. Lines now: $($out.Count)"
