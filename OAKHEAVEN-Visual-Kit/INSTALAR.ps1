param(
    [string]$Projeto = '..'
)
$ErrorActionPreference = 'Stop'
$SourceRoot = $PSScriptRoot
$Resolved = Resolve-Path -LiteralPath $Projeto -ErrorAction Stop
$DestinationRoot = $Resolved.Path

if ($SourceRoot -eq $DestinationRoot) {
    throw 'Abra a pasta do kit EXTRAIDA dentro do projeto, ou informe a pasta correta usando -Projeto.'
}

if (-not ((Test-Path (Join-Path $DestinationRoot 'package.json')) -or
           (Test-Path (Join-Path $DestinationRoot '.git')) -or
           (Test-Path (Join-Path $DestinationRoot 'src')))) {
    throw 'Destino nao parece ser a raiz de um projeto. Nada foi instalado.'
}

Write-Host ''
Write-Host 'OAKHEAVEN / Codex Visual Kit' -ForegroundColor Cyan
Write-Host "Kit: $SourceRoot"
Write-Host "Pasta do jogo (destino): $DestinationRoot"
$Response = Read-Host 'O destino esta correto? Digite S para instalar'
if ($Response -notmatch '^[sS]$') {
    Write-Host 'Cancelado sem alterar arquivos.'
    exit 0
}

$Copied = 0
$Skipped = 0
$Sources = @('.codex', '.agents', 'docs', 'tools')
foreach ($RelativeDirectory in $Sources) {
    $FullDirectory = Join-Path $SourceRoot $RelativeDirectory
    $AllFiles = Get-ChildItem -LiteralPath $FullDirectory -Force -File -Recurse
    foreach ($File in $AllFiles) {
        $RelativePath = $File.FullName.Substring($SourceRoot.Length).TrimStart([char]'\', [char]'/')
        $DestinationFile = Join-Path $DestinationRoot $RelativePath
        $TargetParent = Split-Path -Parent $DestinationFile
        if (-not (Test-Path -LiteralPath $TargetParent)) {
            New-Item -ItemType Directory -Path $TargetParent -Force | Out-Null
        }
        if (Test-Path -LiteralPath $DestinationFile) {
            Write-Host "JA EXISTE (preservado): $RelativePath"
            $Skipped++
            continue
        }
        Copy-Item -LiteralPath $File.FullName -Destination $DestinationFile
        Write-Host "INSTALADO: $RelativePath"
        $Copied++
    }
}

$AgentsSource = Join-Path $SourceRoot 'AGENTS.md'
$AgentsDestination = Join-Path $DestinationRoot 'AGENTS.md'
if (-not (Test-Path -LiteralPath $AgentsDestination)) {
    Copy-Item -LiteralPath $AgentsSource -Destination $AgentsDestination
    Write-Host 'INSTALADO: AGENTS.md'
} else {
    $Existing = [System.IO.File]::ReadAllText($AgentsDestination)
    if ($Existing.Contains('<!-- OAK-VISUAL-NIGHT:START -->')) {
        Write-Host 'AGENTS.md ja contem as instrucoes visuais. Preservado.'
    } else {
        $New = [System.IO.File]::ReadAllText($AgentsSource)
        $Utf8 = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::AppendAllText($AgentsDestination, "`r`n`r`n" + $New, $Utf8)
        Write-Host 'ADICIONADO: bloco visual ao AGENTS.md existente (sem apagar conteudo).'
    }
}

$Prompt = Join-Path $DestinationRoot 'PROMPT-CODEX-VISUAL.md'
if (-not (Test-Path -LiteralPath $Prompt)) {
    Copy-Item -LiteralPath (Join-Path $SourceRoot 'PROMPT-COLE-NO-CODEX.md') -Destination $Prompt
    Write-Host 'INSTALADO: PROMPT-CODEX-VISUAL.md'
}
Write-Host ''
Write-Host "Instalacao concluida: $Copied arquivos de configuracao copiados; $Skipped arquivos existentes preservados." -ForegroundColor Green
Write-Host 'Abra o Codex NA PASTA DO JOGO, crie uma nova conversa e cole PROMPT-CODEX-VISUAL.md.'
