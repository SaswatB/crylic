#Requires -RunAsAdministrator

# install this with `choco install Carbon`
Import-Module 'Carbon'

# todo make these configurable
$service = 'crylic-backend'
$serviceSSHUser = 'root'
$localSSHPort = 2222
$localServicePort = 8080
$remoteServicePort = $localServicePort

function Get-RandomByte {
  Get-Random -Maximum 255 -Minimum 0
}

function ThrowOnNativeFailure {
  if (-not $?) {
      throw 'Native Failure'
  }
}

function ThrowOnProcessStoppedAfterSecond($process) {
  sleep 1
  if ($process.HasExited) {
    if ($process.StandardOutput -ne $null) {
      $process.StandardOutput.ReadToEnd()
      $process.StandardError.ReadToEnd()
    }
    throw "Process Exited"
  }
}

$portProxies = @()
$hostEntries = @()
$processes = @()

try {
  ## connect to the target pod and forward the local service to the pod

  # forward ssh from the target container
  echo "Forwarding SSH for $service to localhost:$localSSHPort"
  $pod = kubectl get pods --selector="app=$service" -o name
  echo "    Pod: $pod"
  ThrowOnNativeFailure
  $process = Start-Process -PassThru -NoNewWindow kubectl -ArgumentList "port-forward",$pod,"$($localSSHPort):22"
  ThrowOnProcessStoppedAfterSecond $process
  $processes += $process

  echo "Tunnelling local port $localServicePort over SSH to pod port $remoteServicePort"
  $process = start-process powershell -ArgumentList "-command","echo 'Enter the password for the pod ssh server after the prompt appears, there will not be any output if it is successful'; ssh -N -R '$($localServicePort):localhost:$($remoteServicePort)' '$($serviceSSHUser):$serviceSSHPassword@localhost' -p $localSSHPort; Read-Host"
  ThrowOnProcessStoppedAfterSecond $process
  $processes += $process

  ## expose all the k8s services locally through the hosts file

  # get all k8s services on the default namespace
  $services = (kubectl get services -o json | convertfrom-json).items | % {
    @{
      name = $_.metadata.name;
      port = @( $_.spec.ports | % { @{ number = $_.port; protocol = $_.protocol } } )
    }
  }
  ThrowOnNativeFailure
  $servicesPrinted = ($services | % {
      $ports = ($_.port | % { $_.number }) -join ","
      "$($_.name):$ports"
    }) -join "; "
  echo "Found services $servicesPrinted"

  foreach ($service in $services) {
    # get a random local ip that will be the service's virtual address
    # todo check if random ip is available
    $localIp = "127.$(Get-RandomByte).$(Get-RandomByte).$(Get-RandomByte)"
    echo "Using $localIp for $($service.name)"
  
    # forward each service port
    foreach ($servicePort in $service.port) {
      # forward the service's port to local
      # todo check if random port is available
      $localPort = Get-Random -Maximum 32767 -Minimum 10001
      echo "Forwarding port for $($service.name):$($servicePort.number) to localhost:$localPort"
      $process = Start-Process -PassThru -NoNewWindow kubectl -ArgumentList "port-forward","service/$($service.name)","$($localPort):$($servicePort.number)"
      ThrowOnProcessStoppedAfterSecond $process
      $processes += $process

      # proxy the service's local port to its local ip
      # these entries can be seen with `netsh interface portproxy show v4tov4`
      echo "Proxying $($localIp):$($servicePort.number) to localhost:$localPort"
      netsh interface portproxy add v4tov4 listenport="$($servicePort.number)" listenaddress=$localIp connectport=$localPort connectaddress=127.0.0.1
      ThrowOnNativeFailure
      $portProxies += @{ ip=$localIp; port=$servicePort.number }
    }

    # add a hosts entry to redirect traffic with the service name to the chosen local ip
    echo "Adding hosts entry for $($service.name) to $localIp"
    Set-HostsEntry -IPAddress $localIp -HostName $service.name -Description "k8s ${$service.name}"
    $hostEntries += $service.name
    echo "Finished $($service.name)!"
    echo ""
  }

  echo "Network rerouting successful! Press Enter to cleanup and exit"
  Read-Host
} finally {
  # clean up the hosts file
  foreach ($hostEntry in $hostEntries) {
    echo "Removing hosts entry for $hostEntry"
    Remove-HostsEntry -HostName $hostEntry
  }

  # clean up port proxies
  foreach ($portProxy in $portProxies) {
    echo "Removing proxy from $($portProxy.ip):$($portProxy.port)"
    netsh interface portproxy delete v4tov4 listenport="$($portProxy.port)" listenaddress="$($portProxy.ip)"
  }

  # cleanup sub processes
  foreach ($process in $processes) {
    if (-not $process.HasExited) {
      echo "Killing process $($process.Name)"
      # $process.kill($true)
      taskkill /PID $process.id /T /F
    }
  }
}
