"""Independent file-only review. Does not edit the composition or launch a browser."""
from pathlib import Path
import hashlib, json, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

video = Path(sys.argv[1]).resolve()
project = Path(sys.argv[2]).resolve()
out = Path(__file__).resolve().parent
frames = out / 'frames'
frames.mkdir(exist_ok=True)

def call(args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result

def hash_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

probe = call(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)])
probe.check_returncode()
(out/'ffprobe.json').write_bytes(probe.stdout)
decode = call(['ffmpeg','-nostdin','-hide_banner','-v','error','-i',str(video),'-f','null','-'])
(out/'full-decode.log').write_bytes(decode.stderr)
audio_stats = call(['ffmpeg','-nostdin','-hide_banner','-i',str(video),'-af','ebur128=peak=true','-vn','-f','null','-'])
(out/'final-ebur128.log').write_bytes(audio_stats.stderr)
black = call(['ffmpeg','-nostdin','-hide_banner','-i',str(video),'-an','-vf','blackdetect=d=0.1:pic_th=0.98:pix_th=0.05','-f','null','-'])
(out/'blackdetect.log').write_bytes(black.stderr)

times=[0,0.5,1.8,3.6,7,13.5,22.5,27.3,30.2,33.3,33.483333,33.633333,33.766667,33.933333,35.3,37,41.8,42.91,43.5,44.466]
saved=[]
for t in times:
    dest=frames/f't-{t:09.6f}.png'
    result=call(['ffmpeg','-nostdin','-hide_banner','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1','-y',str(dest)])
    result.check_returncode()
    if dest.exists(): saved.append({'time':t,'path':str(dest),'sha256':hash_file(dest)})

sheet=Image.new('RGB',(4*480,5*292),'#24211d')
draw=ImageDraw.Draw(sheet)
for idx,item in enumerate(saved):
    im=Image.open(item['path']).convert('RGB').resize((480,270),Image.Resampling.LANCZOS)
    x=(idx%4)*480; y=(idx//4)*292
    sheet.paste(im,(x,y)); draw.text((x+8,y+272),f"{item['time']:.6f}s",fill='white')
sheet.save(out/'contact-sheet.png')

def pcm(path):
    result=call(['ffmpeg','-nostdin','-v','error','-i',str(path),'-map','0:a:0','-ac','2','-ar','48000','-f','f32le','-'])
    result.check_returncode()
    return np.frombuffer(result.stdout,dtype='<f4').reshape(-1,2)

reference=pcm(project/'assets/music-normalized-44_5.wav')
rendered=pcm(video)
samples=min(len(reference),len(rendered))
reference=reference[:samples]; rendered=rendered[:samples]
windows=[]
for start,end in [(0,.1),(.1,.2),(.2,.35),(.35,.7),(1,2),(20,21),(42.4,42.5),(42.5,43),(43,43.5),(43.5,44),(44,44.25),(44.25,44.45),(44.45,44.5)]:
    a=reference[int(start*48000):int(end*48000)].astype('float64').ravel()
    b=rendered[int(start*48000):int(end*48000)].astype('float64').ravel()
    power=float(np.dot(a,a))
    gain=float(np.dot(a,b)/power) if power>1e-16 else None
    windows.append({'startSeconds':start,'endSeconds':end,'estimatedGainAgainstNormalizedSource':gain,'renderedRmsDbfs':float(20*np.log10(max(np.sqrt(np.mean(b*b)),1e-12)))})

receipt={
 'reviewer':'switch_audit',
 'mode':'independent file-only analysis; no browser, no source mutations, no inference',
 'video':str(video),'videoSha256':hash_file(video),
 'project':str(project),'compositionSha256':hash_file(project/'index.html'),
 'briefSha256':hash_file(project/'BRIEF.md'),
 'fullDecodeExitCode':decode.returncode,
 'audioAnalysisExitCode':audio_stats.returncode,
 'blackDetectExitCode':black.returncode,
 'blackIntervals':[line for line in black.stderr.decode(errors='replace').splitlines() if 'black_start:' in line],
 'decodedAudioSamplesPerChannel':len(rendered),
 'decodedAudioPeakLinear':float(np.max(np.abs(rendered))),
 'samplesAtOrAboveFullScale':int(np.count_nonzero(np.abs(rendered)>=1)),
 'audioSourceHash':hash_file(project/'assets/music-normalized-44_5.wav'),
 'audioFadeWindows':windows,
 'frames':saved,
 'visualAcceptance':'pending reviewer inspection',
 'soundLimit':'Measured final signal and source binding; no subjective listening claim.'
}
(out/'analysis-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:receipt[k] for k in ['video','videoSha256','fullDecodeExitCode','blackIntervals','decodedAudioSamplesPerChannel','decodedAudioPeakLinear','samplesAtOrAboveFullScale','visualAcceptance']},indent=2))
