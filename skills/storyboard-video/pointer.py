#!/usr/bin/env python3
# pointer.py : drives the real mouse pointer through a virtual absolute pointer on /dev/uinput, so
# a take shows a cursor gliding and clicking like a user's. Reads one command per line on stdin:
#   move X Y [SECONDS]   glides to X,Y (screen pixels, as in the capture) with ease-in-out
#   click | down | up    left button
#   sleep SECONDS
# A command runs to its end before the next is read. The device lives as long as the process, so a
# take script keeps one instance open (exec 3> >(python3 pointer.py)) rather than one per command.
# Nothing reads the "ok" lines back through that pipe: open it a second or more before rec.sh start,
# for the device's startup, and sleep a move's seconds before the script's own next step.
# Needs write access to /dev/uinput (a logged-in user's ACL on Ubuntu). POINTER_SCREEN=WxH is the
# screen's size in the capture's pixels (default 3840x2400).
import fcntl, math, os, struct, sys, time

W, H = (int(v) for v in os.environ.get("POINTER_SCREEN", "3840x2400").split("x"))
EV_SYN, EV_KEY, EV_ABS, BTN_LEFT, ABS_X, ABS_Y = 0, 1, 3, 0x110, 0, 1
UI_SET_EVBIT, UI_SET_KEYBIT, UI_SET_ABSBIT, UI_DEV_CREATE, UI_DEV_DESTROY = (
    0x40045564, 0x40045565, 0x40045567, 0x5501, 0x5502)

fd = os.open("/dev/uinput", os.O_WRONLY | os.O_NONBLOCK)

for ev in (EV_SYN, EV_KEY, EV_ABS):
    fcntl.ioctl(fd, UI_SET_EVBIT, ev)

fcntl.ioctl(fd, UI_SET_KEYBIT, BTN_LEFT)

for ax in (ABS_X, ABS_Y):
    fcntl.ioctl(fd, UI_SET_ABSBIT, ax)

# struct uinput_user_dev: name, input_id, ff_effects_max, then absmax, absmin, absfuzz, absflat.
absmax = [0] * 64
absmax[ABS_X], absmax[ABS_Y] = W - 1, H - 1
os.write(fd, struct.pack("80sHHHHi64i64i64i64i", b"storyboard-pointer", 3, 1, 1, 1, 0,
                         *absmax, *[0] * 64, *[0] * 64, *[0] * 64))
fcntl.ioctl(fd, UI_DEV_CREATE)

# The compositor needs a moment to pick up a new device; events sent before are lost.
time.sleep(1)


def emit(*events):
    for typ, code, value in events:
        os.write(fd, struct.pack("llHHi", 0, 0, typ, code, value))

    os.write(fd, struct.pack("llHHi", 0, 0, EV_SYN, 0, 0))


pos = None

for line in sys.stdin:
    if not line.split():
        continue

    cmd, *args = line.split()

    if cmd == "move":
        x, y = int(args[0]), int(args[1])
        secs = float(args[2]) if len(args) > 2 else 0
        steps = max(1, int(secs * 120))
        x0, y0 = pos or (x, y)

        for i in range(1, steps + 1):
            t = (1 - math.cos(math.pi * i / steps)) / 2
            emit((EV_ABS, ABS_X, round(x0 + (x - x0) * t)), (EV_ABS, ABS_Y, round(y0 + (y - y0) * t)))
            time.sleep(secs / steps)

        pos = (x, y)
    elif cmd in ("down", "up", "click"):
        if cmd != "up":
            emit((EV_KEY, BTN_LEFT, 1))

        if cmd == "click":
            time.sleep(0.08)

        if cmd != "down":
            emit((EV_KEY, BTN_LEFT, 0))
    elif cmd == "sleep":
        time.sleep(float(args[0]))

    print("ok", cmd, flush=True)

fcntl.ioctl(fd, UI_DEV_DESTROY)
