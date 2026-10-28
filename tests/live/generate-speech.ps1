param([Parameter(Mandatory=$true)][string]$OutputPath)
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
 $s.SelectVoice('Microsoft David Desktop')
 $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
 $s.SetOutputToWaveFile($OutputPath, $format)
 $s.Speak('Check sandbox credentials. Do not deploy to production.')
} finally { $s.Dispose() }
