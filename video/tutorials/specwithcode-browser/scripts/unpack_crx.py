import sys, struct, hashlib, zipfile, io, json, base64, os
crx, out, want = sys.argv[1], sys.argv[2], sys.argv[3]
b = open(crx,'rb').read()
assert b[:4]==b'Cr24' and struct.unpack('<I',b[4:8])[0]==3
hl = struct.unpack('<I',b[8:12])[0]
hdr = b[12:12+hl]; z = b[12+hl:]
def varint(buf,i):
    r=s=0
    while True:
        c=buf[i]; i+=1; r|=(c&0x7f)<<s; s+=7
        if c<0x80: return r,i
def fields(buf):
    i=0
    while i<len(buf):
        k,i=varint(buf,i); f,w=k>>3,k&7
        if w==2:
            l,i=varint(buf,i); yield f,buf[i:i+l]; i+=l
        elif w==0: _,i=varint(buf,i)
        else: raise SystemExit('wire')
key=None
for f,v in fields(hdr):
    if f==2:  # sha256_with_rsa AsymmetricKeyProof
        for g,pv in fields(v):
            if g==1:
                eid=''.join(chr(ord('a')+int(c,16)) for c in hashlib.sha256(pv).hexdigest()[:32])
                if eid==want: key=pv
assert key, 'no key matching id'
zipfile.ZipFile(io.BytesIO(z)).extractall(out)
m=json.load(open(os.path.join(out,'manifest.json')))
m['key']=base64.b64encode(key).decode()
json.dump(m,open(os.path.join(out,'manifest.json'),'w'),indent=2)
print('ok', m['version'], want)
