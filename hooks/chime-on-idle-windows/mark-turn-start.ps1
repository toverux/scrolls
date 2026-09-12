# Version: 1.0.0

# UserPromptSubmit hook: stamp when the user last typed, so the Stop hook can
# tell a long wait from a quick reply. Fires once per prompt, not once per
# turn, so the elapsed time spans a whole dispatch-and-report agent chain.

$raw = [Console]::In.ReadToEnd()
try { $j = $raw | ConvertFrom-Json -Depth 20 } catch { exit 0 }
if (-not $j.session_id) { exit 0 }

$dir = Join-Path $PSScriptRoot 'state'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

Set-Content -Path (Join-Path $dir "$($j.session_id).start") `
  -Value ([DateTime]::UtcNow.ToString('o')) -ErrorAction SilentlyContinue

# Sessions never announce that they are gone, so stamps are pruned by age.
Get-ChildItem $dir -Filter *.start -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
  Remove-Item -Force -ErrorAction SilentlyContinue

exit 0
