# Version: 1.0.0

# Stop hook: chime only when the turn ends with nothing still running AND the
# wait was long enough to be worth announcing.
#
# Stop fires at the end of every turn, including the one that dispatches a
# background agent and hands control back while it works, and again each time
# a completion re-invokes the agent. background_tasks distinguishes "done"
# from "handed off"; the elapsed check distinguishes "you walked away" from
# "you are sitting here reading".

$MinSeconds = 300

$raw = [Console]::In.ReadToEnd()
try { $j = $raw | ConvertFrom-Json -Depth 20 } catch { exit 0 }

$pending = @($j.background_tasks | Where-Object { $_.status -eq 'running' })

# -1 means no stamp: a session older than this hook, or a Stop with no prompt
# behind it. Stay quiet rather than guess, since the whole point is less noise.
$stamp = Join-Path $PSScriptRoot "state\$($j.session_id).start"
$elapsed = -1
if (Test-Path $stamp) {
  $started = [DateTime]::Parse((Get-Content -Raw $stamp).Trim(), $null,
    [System.Globalization.DateTimeStyles]::RoundtripKind)
  $elapsed = [Math]::Round(([DateTime]::UtcNow - $started).TotalSeconds)
}

if ($pending.Count -gt 0 -or $elapsed -lt $MinSeconds) { exit 0 }

Start-Process -WindowStyle Hidden -FilePath 'pwsh' -ArgumentList @(
  '-NoProfile', '-File', (Join-Path $PSScriptRoot 'play-sound.ps1')
)

exit 0
