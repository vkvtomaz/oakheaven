$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
public static class OakCutout {
  public static void Save(string input,string output,int x,int y,int w,int h,int mode) {
    using(var original=new Bitmap(input))
    using(var bmp=original.Clone(new Rectangle(x,y,w,h),PixelFormat.Format32bppArgb)) {
      var visited=new bool[w*h]; var queue=new Queue<int>();
      // Keep an immutable copy: edge tests must not inspect already keyed pixels.
      var pixels=new Color[w*h];
      for(int py=0;py<h;py++)for(int px=0;px<w;px++)pixels[py*w+px]=bmp.GetPixel(px,py);
      Action<int,int> add=(px,py)=> { if(px<0||py<0||px>=w||py>=h)return; int i=py*w+px; if(visited[i])return; visited[i]=true;
        var c=pixels[i];
        // Match the measured studio background, not every light gray pixel.
        // Pale bark, stone and metal can touch the silhouette and must survive.
        int distance=mode==0 ? Math.Abs(c.R-48)+Math.Abs(c.G-35)+Math.Abs(c.B-49)
          : mode==2 ? Math.Abs(c.R-193)+Math.Abs(c.G-197)+Math.Abs(c.B-201)
          : Math.Abs(c.R-203)+Math.Abs(c.G-203)+Math.Abs(c.B-203);
        int limit=mode==0 ? 70 : mode==2 ? 27 : 32;
        int gradient=0;
        for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++){
          int nx=px+dx,ny=py+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
          var n=pixels[ny*w+nx]; gradient=Math.Max(gradient,Math.Abs(n.R-c.R)+Math.Abs(n.G-c.G)+Math.Abs(n.B-c.B));
        }
        bool shadow=mode!=0 && gradient<22 && c.R>55 &&
          (mode==2 ? c.G>=c.R && c.B>=c.G && c.B-c.R<45
                   : Math.Max(c.R,Math.Max(c.G,c.B))-Math.Min(c.R,Math.Min(c.G,c.B))<17);
        if(mode==2 && py<550)shadow=false;
        bool glow=mode==2 && py>280 && gradient<38 && c.R>190 && c.G>180 && c.R>=c.G+2 && c.G>=c.B && c.B>150 && c.R-c.B>12 && c.R-c.B<90;
        if(distance<limit || shadow || glow)queue.Enqueue(i);
      };
      for(int px=0;px<w;px++){add(px,0);add(px,h-1);} for(int py=0;py<h;py++){add(0,py);add(w-1,py);}
      // Explicit seeds lie in actual photographed background, inside enclosed
      // gaps. Global color-key seeds would puncture similarly colored metal.
      if(output.EndsWith("sanctuary.png")){add(395,210);add(430,175);}
      if(output.EndsWith("forge.png")){add(610,470);}
      while(queue.Count>0){
        int i=queue.Dequeue(),px=i%w,py=i/w; var c=pixels[i];
        int distance=mode==0 ? Math.Abs(c.R-48)+Math.Abs(c.G-35)+Math.Abs(c.B-49)
          : mode==2 ? Math.Abs(c.R-193)+Math.Abs(c.G-197)+Math.Abs(c.B-201)
          : Math.Abs(c.R-203)+Math.Abs(c.G-203)+Math.Abs(c.B-203);
        // Soft coverage preserves painted glow without an opaque purple fringe.
        int inner=mode==0 ? 55 : 12; int outer=mode==0 ? 70 : mode==2 ? 27 : 32;
        int alpha=(int)(255.0*Math.Max(0,distance-inner)/(outer-inner));
        if(mode!=0) {
          // Discard keyed studio shadow and connected background glow. Recoloring
          // photographed background would create a flat patch behind the sprite.
          bmp.SetPixel(px,py,Color.Transparent);
        } else bmp.SetPixel(px,py,Color.FromArgb(Math.Min(255,alpha),c.R,c.G,c.B));
        add(px-1,py);add(px+1,py);add(px,py-1);add(px,py+1);
      }
      bmp.Save(output,ImageFormat.Png);
    }
  }
}
'@
$root = Split-Path $PSScriptRoot -Parent
$output = Join-Path $root 'public/art'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$cuts = @(
  @('spritesheet.jpg','hero',45,85,285,250,0),
  @('spritesheet.jpg','scout',370,80,280,260,0),
  @('spritesheet.jpg','brute',695,70,275,265,0),
  @('spritesheet.jpg','alpha',990,5,350,335,0),
  @('spritesheet.jpg','arc_ballista',45,410,295,270,0),
  @('spritesheet.jpg','slag_forge',360,415,230,270,0),
  @('spritesheet.jpg','repulsor',635,380,155,300,0),
  @('spritesheet.jpg','chitin_cannon',825,450,245,235,0),
  @('spritesheet.jpg','spike_barricade',1090,425,250,255,0),
  @('itens-3d.jpg','stone',30,165,345,260,1),
  @('itens-3d.jpg','roof',416,140,308,291,1),
  @('itens-3d.jpg','bridge',35,465,330,260,1),
  @('itens-3d.jpg','pad',401,494,338,234,1),
  @('itens-3d.jpg','wood',45,800,330,215,1),
  @('itens-3d.jpg','scrap',418,795,302,220,1),
  @('itens-3d.jpg','ore',93,1085,230,219,1),
  @('itens-3d.jpg','crystal',470,1070,191,240,1),
  @('tumulo-familia-kaelen.jpg','sanctuary',15,140,730,1070,2),
  @('forja-do-kaelen.jpg','forge',10,130,748,1040,1)
)
foreach ($cut in $cuts) {
  [OakCutout]::Save((Join-Path $root ('img/' + $cut[0])),(Join-Path $output ($cut[1] + '.png')),$cut[2],$cut[3],$cut[4],$cut[5],$cut[6])
  Write-Output ('Prepared ' + $cut[1])
}
