# Kuulamisabi: võrdlusklipid teise häälega (Charon) kausta kirjutaja/audio2.
# Jookseb taustal, sest Gemini TTS partii võtab kauem kui sillakõne 60 s.
param([int]$MaxRequests = 6, [int]$Batch = 12)
$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\Silver\Documents\GitHub\harjutaja'
Remove-Item 'tools\audio2_done.txt' -ErrorAction SilentlyContinue
python tools\audio_gen.py --voice Charon --out audio2 --raw audio2_raw --max-requests $MaxRequests --batch $Batch *> 'tools\audio2_run.txt'
'DONE' | Set-Content 'tools\audio2_done.txt'
