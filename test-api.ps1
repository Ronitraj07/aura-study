# Test script for /api/parse endpoint

# Create a test text file
$testFilePath = "h:\aura-study\test-file.txt"
$testContent = @"
This is a test document for Smart Mode.

It contains multiple paragraphs to test the file parsing API.

The quick brown fox jumps over the lazy dog.
This is sample text for testing content extraction.

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
"@

# Write test file
Set-Content -Path $testFilePath -Value $testContent -Encoding UTF8

# Create a FormData multipart request
$boundary = [System.Guid]::NewGuid().ToString()
$bodyEncoding = [System.Text.Encoding]::UTF8
$bodyBytes = $bodyEncoding.GetBytes("")

# Read the file
$fileContent = [System.IO.File]::ReadAllBytes($testFilePath)

# Build multipart body
$multipartBody = ""
$multipartBody += "--$boundary`r`n"
$multipartBody += 'Content-Disposition: form-data; name="file"; filename="test-file.txt"' + "`r`n"
$multipartBody += "Content-Type: text/plain`r`n`r`n"

# Convert multipart header to bytes
$headerBytes = [System.Text.Encoding]::UTF8.GetBytes($multipartBody)

# Combine: header + file content + boundary
$boundaryBytes = [System.Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n")
$bodyBytes = $headerBytes + $fileContent + $boundaryBytes

Write-Host "Testing /api/parse endpoint..."
Write-Host "File size: $(($fileContent | Measure-Object -Character).Characters) bytes"
Write-Host "Total body size: $($bodyBytes.Length) bytes"

# Send the request
$response = Invoke-WebRequest -Uri "http://localhost:8082/api/parse" `
    -Method POST `
    -Headers @{ "Content-Type" = "multipart/form-data; boundary=$boundary" } `
    -Body $bodyBytes `
    -SkipHttpErrorCheck

Write-Host "`nResponse Status: $($response.StatusCode)"
Write-Host "Response Content:`n$($response.Content)"

# Cleanup
Remove-Item -Path $testFilePath
