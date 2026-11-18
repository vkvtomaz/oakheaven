$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
public static class OakArenaCutout {
  public static void Save(string input,string output,bool blueStudio) {
    using(var original=new Bitmap(input)) {
      int w=original.Width,h=original.Height;
      var pixels=new Color[w*h]; var queued=new bool[w*h]; var removed=new bool[w*h];
      for(int y=0;y<h;y++)for(int x=0;x<w;x++)pixels[y*w+x]=original.GetPixel(x,y);
      var queue=new Queue<int>();
      Action<int,int> add=(x,y)=>{
        if(x<0||y<0||x>=w||y>=h)return;int i=y*w+x;if(queued[i])return;queued[i]=true;
        var c=pixels[i]; int max=Math.Max(c.R,Math.Max(c.G,c.B)),min=Math.Min(c.R,Math.Min(c.G,c.B));
        int gradient=0;
        for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++){
          int nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
          var n=pixels[ny*w+nx];gradient=Math.Max(gradient,Math.Abs(n.R-c.R)+Math.Abs(n.G-c.G)+Math.Abs(n.B-c.B));
        }
        bool neutral=blueStudio ? c.G>=c.R-2 && c.B>=c.G-2 && max-min<24 : max-min<12;
        bool studio=neutral && c.R>62 && gradient<30;
        bool castShadow=y>h*0.65 && c.R>48 && c.G>=c.R-2 && c.B>=c.G-2 && max-min<36 && gradient<28;
        bool halo=!blueStudio && min>140 && max-min<40 && c.B>=c.G && c.R>=c.G && gradient<30;
        if(studio||castShadow||halo)queue.Enqueue(i);
      };
      for(int x=0;x<w;x++){add(x,0);add(x,h-1);}for(int y=0;y<h;y++){add(0,y);add(w-1,y);}
      // Only broad, extremely smooth regions can seed enclosed studio gaps.
      // Texture and dark object contours protect gray stone and metal.
      for(int y=4;y<h-4;y+=4)for(int x=4;x<w-4;x+=4){
        var c=pixels[y*w+x];int range=Math.Max(c.R,Math.Max(c.G,c.B))-Math.Min(c.R,Math.Min(c.G,c.B));
        if(c.R<155||range>(blueStudio?12:3))continue;
        int variation=0;
        for(int dy=-3;dy<=3;dy++)for(int dx=-3;dx<=3;dx++){
          var n=pixels[(y+dy)*w+x+dx];variation=Math.Max(variation,Math.Abs(n.R-c.R)+Math.Abs(n.G-c.G)+Math.Abs(n.B-c.B));
        }
        if(variation<12)add(x,y);
      }
      while(queue.Count>0){int i=queue.Dequeue();removed[i]=true;int x=i%w,y=i/w;add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}
      using(var result=new Bitmap(w,h,PixelFormat.Format32bppArgb)){
        int minX=w,minY=h,maxX=0,maxY=0;
        for(int y=0;y<h;y++)for(int x=0;x<w;x++){
          int i=y*w+x;var c=pixels[i];int alpha=255;
          if(removed[i]){
            int sat=Math.Max(c.R,Math.Max(c.G,c.B))-Math.Min(c.R,Math.Min(c.G,c.B));
            alpha=!blueStudio && c.B>c.G+9 && c.R>c.G+4 ? Math.Min(150,(sat-8)*5) : 0;
          }
          result.SetPixel(x,y,Color.FromArgb(Math.Max(0,alpha),c.R,c.G,c.B));
          if(alpha>30){minX=Math.Min(minX,x);maxX=Math.Max(maxX,x);minY=Math.Min(minY,y);maxY=Math.Max(maxY,y);}
        }
        minX=Math.Max(0,minX-4);minY=Math.Max(0,minY-4);maxX=Math.Min(w-1,maxX+4);maxY=Math.Min(h-1,maxY+4);
        using(var crop=result.Clone(new Rectangle(minX,minY,maxX-minX+1,maxY-minY+1),PixelFormat.Format32bppArgb))crop.Save(output,ImageFormat.Png);
        Console.WriteLine(System.IO.Path.GetFileName(output)+": "+(maxX-minX+1)+"x"+(maxY-minY+1));
      }
    }
  }
}
'@
$root = Split-Path $PSScriptRoot -Parent
$output = Join-Path $root 'public/art/arena'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$cuts = @(
  @('balesta-arco-voltaico','arc_ballista',$false),
  @('forja-escoria','slag_forge',$false),
  @('monolito-repulsor','repulsor',$false),
  @('canhao-de-quitina','chitin_cannon',$false),
  @('barricada-espinhos','spike_barricade',$false),
  @('rastejador-de-eter','scout',$false),
  @('golias-de-obsidiana','brute',$true)
)
foreach($cut in $cuts){
  [OakArenaCutout]::Save((Join-Path $root ('img/'+$cut[0]+'.jpg')),(Join-Path $output ($cut[1]+'.png')),$cut[2])
}
