@echo off
set CI=1
cd /d "C:\Users\Francis Adrian Idul\AdlaWatt-"
node "%APPDATA%\npm\node_modules\eas-cli\bin\run" update --channel preview --environment preview --message CompactCustomModal > "C:\Users\Francis Adrian Idul\AdlaWatt-\ota-out.txt" 2> "C:\Users\Francis Adrian Idul\AdlaWatt-\ota-err.txt"
