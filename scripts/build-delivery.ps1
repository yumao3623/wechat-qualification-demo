param(
  [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$projectConfigPath = Join-Path $projectRoot "project.config.json"
$projectConfig = Get-Content -Raw -LiteralPath $projectConfigPath | ConvertFrom-Json

if ($projectConfig.appid -ne "touristappid") {
  throw "共享 project.config.json 必须使用 touristappid，个人 AppID 只能保存在 project.private.config.json。"
}

if (-not $OutputDirectory) {
  $OutputDirectory = Join-Path $projectRoot "_delivery"
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "企业资质预评估小程序Demo-最终交付-$stamp"
$zipPath = Join-Path $outputPath "$packageName.zip"

$rootFiles = @(
  ".env.example",
  ".gitignore",
  "package.json",
  "pnpm-lock.yaml",
  "project.config.json",
  "README.md",
  "交付说明.md"
)
$sourceDirectories = @("docs", "miniprogram", "scripts", "server", "tests")
$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()

foreach ($relativePath in $rootFiles) {
  $filePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
    throw "交付所需文件不存在：$relativePath"
  }
  $files.Add((Get-Item -LiteralPath $filePath))
}

foreach ($directory in $sourceDirectories) {
  $directoryPath = Join-Path $projectRoot $directory
  if (-not (Test-Path -LiteralPath $directoryPath -PathType Container)) {
    throw "交付所需目录不存在：$directory"
  }
  Get-ChildItem -LiteralPath $directoryPath -File -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($projectRoot.Length).TrimStart([char]'\')
    if ($relativePath -notlike "server\data\runtime\*") {
      $files.Add($_)
    }
  }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($projectRoot.Length).TrimStart([char]'\').Replace('\', '/')
    $entryName = "$packageName/$relativePath"
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive,
      $file.FullName,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $archive.Dispose()
}

Write-Output $zipPath
