#!/usr/bin/env python3
# SHA-1 Key Generator Helper for Pravix GPT
# Run: python3 get_sha1.py
# Requirements: Java JDK installed (keytool in PATH)
import subprocess, sys, os, platform

def get_sha1():
    s = platform.system()
    ks = os.path.expandvars(r'%USERPROFILE%\\.android\\debug.keystore') if s=='Windows' else os.path.expanduser('~/.android/debug.keystore')
    if not os.path.exists(ks):
        print('[!] Debug keystore not found. Run: npx expo start --android'); sys.exit(1)
    cmd = ['keytool','-list','-v','-keystore',ks,'-alias','androiddebugkey','-storepass','android','-keypass','android']
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print('[!] Error:', r.stderr); sys.exit(1)
    print(r.stdout)
    for line in r.stdout.splitlines():
        if 'SHA1:' in line:
            sha1 = line.split('SHA1:')[1].strip()
            print('\n' + '='*60 + f'\n  SHA-1: {sha1}\n' + '='*60)
            print('\nAdd this SHA-1 in Firebase Console > Project Settings > Your Android App')
            return sha1

if __name__ == '__main__': get_sha1()
