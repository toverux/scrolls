# Version: 1.0.0

# Runs detached from the Stop hook, which must exit promptly. PlaySync is
# required: with Play() the process exits and takes the sound with it.
(New-Object System.Media.SoundPlayer 'C:\Windows\Media\Windows Proximity Connection.wav').PlaySync()
