# Version: 1.0.0

# PostToolUse hook on PushNotification: chime and show the agent's message as
# a toast. Claude Code's own desktop notification only reaches a few terminals
# (Ghostty, Kitty, iTerm2), so this one goes through the Windows toast API.
#
# Both follow the tool's verdict: localSent is false when the terminal has
# focus, so they fire only while you are away from it.

# Claude Code writes UTF-8, but [Console]::In decodes with the console's code
# page, which garbles any non-ASCII message.
$stdin = [IO.StreamReader]::new([Console]::OpenStandardInput(), [Text.Encoding]::UTF8)
$raw = $stdin.ReadToEnd()

try {
  $j = $raw | ConvertFrom-Json -Depth 20
} catch {
  exit 0
}

if ($j.tool_response.localSent -ne $true) {
  exit 0
}

$project = if ($j.cwd) {
  Split-Path -Leaf $j.cwd
}

if (-not $project) {
  $project = 'a session'
}

# Detached so the hook exits promptly while the sound plays out. The text
# travels in environment variables, which the child inherits, because
# Start-Process does not quote the elements of -ArgumentList.
$env:CLAUDE_PUSH_TITLE = "Claude needs you in $project"
$env:CLAUDE_PUSH_BODY = "$($j.tool_input.message)"
Start-Process -WindowStyle Hidden -FilePath 'powershell' -ArgumentList @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass',
  '-File', "`"$(Join-Path $PSScriptRoot 'show-alert.ps1')`""
)

exit 0
