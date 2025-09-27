param(
    [string]$InputFolder = '',
    [string]$OutputFolder = '',
    [string]$Environment = '',
    [string]$Pipeline = '',
    [string]$OutputType = '',
    [string]$VideoMasking = '',
    [string]$RedactionLevel = ''
)

Write-Host ""
Write-Host "PowerShell AI Runner"
Write-Host "--------------------"
Write-Host ("Input folder      : {0}" -f ($InputFolder   | ForEach-Object { $_.Trim() }))
Write-Host ("Output folder     : {0}" -f ($OutputFolder  | ForEach-Object { $_.Trim() }))
Write-Host ("Environment       : {0}" -f ($Environment   | ForEach-Object { $_.Trim() }))
Write-Host ("Pipeline          : {0}" -f ($Pipeline      | ForEach-Object { $_.Trim() }))
Write-Host ("Output type       : {0}" -f ($OutputType    | ForEach-Object { $_.Trim() }))
Write-Host ("Video masking     : {0}" -f ($VideoMasking  | ForEach-Object { $_.Trim() }))
Write-Host ("Redaction level   : {0}" -f ($RedactionLevel| ForEach-Object { $_.Trim() }))
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? (y/n)"

if ($confirmation -match '^(y|yes)$') {
    Write-Host ""
    Write-Host "Proceeding..."
    Write-Host "(Add your processing steps here.)"
} else {
    Write-Host ""
    Write-Host "Aborted by user."
}
Write-Host ""
Write-Host "Press Enter to close this window."
[void][System.Console]::ReadLine()
