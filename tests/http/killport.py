import os, sys
port = int(sys.argv[1]); hexport = "%04X" % port
inodes = set()
for f in ("/proc/net/tcp", "/proc/net/tcp6"):
    try:
        for line in open(f).read().splitlines()[1:]:
            p = line.split()
            if p[1].split(":")[1] == hexport and p[3] == "0A":  # LISTEN
                inodes.add(p[9])
    except FileNotFoundError:
        pass
killed = []
for pid in filter(str.isdigit, os.listdir("/proc")):
    try:
        for fd in os.listdir(f"/proc/{pid}/fd"):
            try:
                l = os.readlink(f"/proc/{pid}/fd/{fd}")
            except OSError:
                continue
            if l.startswith("socket:[") and l[8:-1] in inodes:
                os.kill(int(pid), 9); killed.append(pid); break
    except (PermissionError, FileNotFoundError):
        pass
print("killed", killed)
