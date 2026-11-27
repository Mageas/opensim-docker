# Load test from Windows

pCampBot logs fake avatars into the RC instance from a Windows PC. On Windows it runs as is: the bug that breaks it on Linux and macOS does not exist there. Nothing changes on op1, Coolify or the image.

Every command runs in PowerShell on the Windows PC, except `docker stats`, which runs on op1.


## Already in place

- 200 bot accounts, `Ima Bot0` to `Ima Bot199`, all with the password generated when they were created (see [Operations](operations.md#create-the-bot-accounts)).
- 151 regions: `Ma Region` and `Test 001` to `Test 150`.


## 1. Install .NET 8

Once:

```powershell
winget install Microsoft.DotNet.SDK.8
```

Then close PowerShell and open it again, so that it finds `dotnet`.


## 2. Build pCampBot

Once:

```powershell
cd $HOME; curl.exe -L -o opensim.zip https://github.com/opensim/opensim/archive/refs/heads/0.9.3.0.zip
```

```powershell
tar -xf opensim.zip; cd opensim-0.9.3.0
```

```powershell
.\runprebuild.bat
```

```powershell
dotnet build -c Release OpenSim\Tools\pCampBot\pCampBot.csproj
```

The build takes a few minutes. Warnings are normal; the summary at the end must say 0 errors.


## 3. Start the bots

```powershell
cd $HOME\opensim-0.9.3.0\bin
```

```powershell
copy pCampBot.ini.example pCampBot.ini
```

Type the bot password:

```powershell
$p = Read-Host 'Bot password'
```

```powershell
dotnet pCampBot.dll -loginuri http://rc.opensim.dokserv.fr:9100/ -firstname Ima -lastname Bot -password $p -botcount 200 -start "Ma Region" -behaviours p
```

If the Windows firewall asks about `dotnet`, click **Allow**.

In the pCampBot console, type `connect 1`. It must print `Bot Ima Bot0 connected to region Ma Region`.


## 4. Ramp up

A region takes 40 avatars. Past 40, OpenSim sends each new bot to the nearest region with room: Test 001, then Test 016, Test 031 and Test 002. The first three steps load one region, the next ones the whole server.

| Step | Command | Bots in total | New bots go to |
| --- | --- | --- | --- |
| 1 | `connect 9` | 10 | Ma Region |
| 2 | `connect 10` | 20 | Ma Region |
| 3 | `connect 20` | 40 | Ma Region, now full |
| 4 | `connect 40` | 80 | Test 001 |
| 5 | `connect 40` | 120 | Test 016 |
| 6 | `connect 40` | 160 | Test 031 |
| 7 | `connect 40` | 200 | Test 002 |

The bots log in one every 5 seconds. Wait for the last one, then hold the step 5 minutes.

Stop at the first step where the region breaks (see step 6). `disconnect` logs all bots out, `quit` ends pCampBot.

If you log in to Ma Region during the test, you take one of its 40 places.


## 5. Measure

In a second PowerShell window, paste this block. It writes the Ma Region stats to a CSV file in your home folder every 10 seconds:

```powershell
$f = "$HOME\run-$(Get-Date -Format yyyy-MM-dd-HHmm).csv"
while ($true) {
  $s = (Invoke-WebRequest -UseBasicParsing 'http://rc.opensim.dokserv.fr:9100/jsonSimStats?region=1eed0ed7-67ab-48b7-85f2-42b82b6d6ad7').Content | ConvertFrom-Json
  (Get-Date -Format s), $s.RootAg, $s.Dilatn, $s.SimFPS, $s.TotlFt, $s.PhysFt, $s.AgntFt, $s.NetFt, $s.PktOut, $s.UnackB, $s.ProcMem -join ',' | Tee-Object -FilePath $f -Append
  Start-Sleep 10
}
```

Columns: time, bots, dilation, simulator fps, frame ms, physics ms, agents ms, network ms, packets out, unacked bytes, process memory in KB. Ctrl+C stops it.

To follow a test region instead, replace the `region=` value with its name, such as `Test%20001`.

On op1, for the whole server:

```bash
docker stats opensim-ht9olgthwh3dybugzvsfstcr db-ht9olgthwh3dybugzvsfstcr
```

In the CPU column, 100% is one core and 800% is the whole machine.

To see the threads:

```bash
top -H -p "$(docker inspect -f '{{.State.Pid}}' opensim-ht9olgthwh3dybugzvsfstcr)"
```

A region runs its main loop on one thread, so one thread near 100% means that region is bound by one core.

On the Windows PC, watch the Task Manager. Past 80% CPU, or with the connection saturated, the bots lag and the numbers are wrong. Do not play or run Firestorm on this PC during the test: watch from another machine.


## 6. Read the results

At rest: dilation 1, 55 fps, a frame time of 18.2 ms, and 1.3 GB of memory for the 151 regions.

A region reaches its limit when its dilation stays under 0.9 or its frame time stays above 20 ms. `PhysFt`, `AgntFt` and `NetFt` then show which part takes the time. `UnackB` growing means the server cannot keep up sending to the bots.

The server reaches its limit when OpenSim's CPU nears 800%, or when the other apps on op1 slow down.


## If something fails

- `dotnet` is not recognised: open a new PowerShell window after the install.
- `Could not authenticate`: the password is wrong.
- `Unable to connect to simulator`: the bots do not reach the region over UDP. Check that the Windows firewall allows `dotnet`.
- Bots land in Test 001 before 40 bots: other avatars are already in Ma Region.
