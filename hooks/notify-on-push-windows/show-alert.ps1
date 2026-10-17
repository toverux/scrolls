# Version: 2.0.0

# Runs detached from notify-on-push.ps1, under Windows PowerShell rather than
# pwsh: only .NET Framework still reaches the WinRT toast API.
#
# The toast borrows PowerShell's AppUserModelID, since Windows shows toasts
# only for a registered app, and stays silent so the chime is the only sound.
# PlaySync is required: with Play() the process exits and takes the sound with
# it.

$null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
$null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]

$title = [Security.SecurityElement]::Escape($env:CLAUDE_PUSH_TITLE)
$body = [Security.SecurityElement]::Escape($env:CLAUDE_PUSH_BODY)
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml(@"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>$title</text>
      <text>$body</text>
    </binding>
  </visual>
  <audio silent="true"/>
</toast>
"@)
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show(
  [Windows.UI.Notifications.ToastNotification]::new($xml))

(New-Object System.Media.SoundPlayer 'C:\Windows\Media\Windows Proximity Connection.wav').PlaySync()
