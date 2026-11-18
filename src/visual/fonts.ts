export async function loadInterfaceFonts(): Promise<void> {
  await Promise.all(['IM Fell English', 'Alegreya', 'Alegreya Sans'].map(async (family) => {
    const file = family === 'IM Fell English' ? 'imfellenglish' : family === 'Alegreya' ? 'alegreya' : 'alegreyasans';
    if (![...document.fonts].some(font => font.family.replaceAll('"', '') === family && font.status === 'loaded')) {
      const font = new FontFace(family, `url(${import.meta.env.BASE_URL}fonts/${file}.ttf)`, { weight: family === 'Alegreya' ? '400 700' : '400' });
      document.fonts.add(await font.load());
    }
  }));
  await document.fonts.ready;
}
