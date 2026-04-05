$path = "d:\IDEA\Projekt\away\src\app\admin\settings\page.tsx"
$bytes = [System.IO.File]::ReadAllBytes($path)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Fix double-encoded German chars (UTF-8 bytes misread as Latin-1 then re-encoded)
$text = $text.Replace("Ã„", [string][char]0xC4)   # Ä
$text = $text.Replace("Ã¤", [string][char]0xE4)   # ä
$text = $text.Replace("Ã¶", [string][char]0xF6)   # ö
$text = $text.Replace("Ã¼", [string][char]0xFC)   # ü
$text = $text.Replace("ÃŸ", [string][char]0xDF)   # ß
$text = $text.Replace("Ã©", [string][char]0xE9)   # é
$text = $text.Replace("Ã»", [string][char]0xFB)   # û
$text = $text.Replace("Ã€", [string][char]0xC0)   # À
$text = $text.Replace(([string][char]0xC3 + [string][char]0x96), [string][char]0xD6)   # Ö
$text = $text.Replace(([string][char]0xC3 + [string][char]0x9C), [string][char]0xDC)   # Ü

$outBytes = [System.Text.Encoding]::UTF8.GetBytes($text)
[System.IO.File]::WriteAllBytes($path, $outBytes)
Write-Host "OK - encoding fixed"
