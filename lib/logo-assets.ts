export type LogoSource = "website-icon" | "apple-touch-icon" | "favicon" | "clearbit" | "google-favicon" | "local" | "generated-fallback";

export type LogoAsset = {
  officialLogoUrl: string;
  faviconUrl: string;
  logoSource: LogoSource;
};

export const logoAssets: Record<string, LogoAsset> = {
  "chatgpt": {
    "officialLogoUrl": "/logos/tools/chatgpt.png",
    "faviconUrl": "/logos/tools/chatgpt.png",
    "logoSource": "google-favicon"
  },
  "claude": {
    "officialLogoUrl": "/logos/tools/claude.png",
    "faviconUrl": "",
    "logoSource": "apple-touch-icon"
  },
  "perplexity": {
    "officialLogoUrl": "/logos/tools/perplexity.png",
    "faviconUrl": "",
    "logoSource": "apple-touch-icon"
  },
  "cursor": {
    "officialLogoUrl": "/logos/tools/cursor.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "windsurf": {
    "officialLogoUrl": "/logos/tools/windsurf.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "lovable": {
    "officialLogoUrl": "/logos/tools/lovable.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "replit": {
    "officialLogoUrl": "/logos/tools/replit.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "runway": {
    "officialLogoUrl": "/logos/tools/runway.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "kling": {
    "officialLogoUrl": "/logos/tools/kling.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "pika": {
    "officialLogoUrl": "/logos/tools/pika.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "elevenlabs": {
    "officialLogoUrl": "/logos/tools/elevenlabs.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "midjourney": {
    "officialLogoUrl": "/logos/tools/midjourney.png",
    "faviconUrl": "/logos/tools/midjourney.png",
    "logoSource": "google-favicon"
  },
  "ideogram": {
    "officialLogoUrl": "/logos/tools/ideogram.png",
    "faviconUrl": "/logos/tools/ideogram.png",
    "logoSource": "google-favicon"
  },
  "heygen": {
    "officialLogoUrl": "/logos/tools/heygen.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "synthesia": {
    "officialLogoUrl": "/logos/tools/synthesia.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "granola": {
    "officialLogoUrl": "/logos/tools/granola.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "notion-ai": {
    "officialLogoUrl": "/logos/tools/notion-ai.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "zapier": {
    "officialLogoUrl": "/logos/tools/zapier.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "lindy": {
    "officialLogoUrl": "/logos/tools/lindy.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "gamma": {
    "officialLogoUrl": "/logos/tools/gamma.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "manus": {
    "officialLogoUrl": "/logos/tools/manus.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "v0": {
    "officialLogoUrl": "/logos/tools/v0.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "bolt": {
    "officialLogoUrl": "/logos/tools/bolt.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "linear": {
    "officialLogoUrl": "/logos/tools/linear.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "capcut": {
    "officialLogoUrl": "/logos/tools/capcut.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "descript": {
    "officialLogoUrl": "/logos/tools/descript.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "suno": {
    "officialLogoUrl": "/logos/tools/suno.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "udio": {
    "officialLogoUrl": "/logos/tools/udio.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "notebooklm": {
    "officialLogoUrl": "/logos/tools/notebooklm.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "grok": {
    "officialLogoUrl": "/logos/tools/grok.ico",
    "faviconUrl": "/logos/tools/grok.ico",
    "logoSource": "favicon"
  },
  "tome": {
    "officialLogoUrl": "/logos/tools/tome.png",
    "faviconUrl": "/logos/tools/tome.png",
    "logoSource": "google-favicon"
  },
  "clay": {
    "officialLogoUrl": "/logos/tools/clay.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "jasper": {
    "officialLogoUrl": "/logos/tools/jasper.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "glean": {
    "officialLogoUrl": "/logos/tools/glean.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "make": {
    "officialLogoUrl": "/logos/tools/make.png",
    "faviconUrl": "",
    "logoSource": "apple-touch-icon"
  },
  "framer-ai": {
    "officialLogoUrl": "/logos/tools/framer-ai.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "vercel": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=vercel.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=vercel.com&sz=64",
    "logoSource": "google-favicon"
  },
  "n8n": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=n8n.io&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=n8n.io&sz=64",
    "logoSource": "google-favicon"
  },
  "apollo": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=apollo.io&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=apollo.io&sz=64",
    "logoSource": "google-favicon"
  },
  "framer": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=framer.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=framer.com&sz=64",
    "logoSource": "google-favicon"
  },
  "typefully": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=typefully.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=typefully.com&sz=64",
    "logoSource": "google-favicon"
  },
  "slack": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=slack.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=slack.com&sz=64",
    "logoSource": "google-favicon"
  },
  "hubspot": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=hubspot.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=hubspot.com&sz=64",
    "logoSource": "google-favicon"
  },
  "instantly": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=instantly.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=instantly.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "taplio": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=taplio.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=taplio.com&sz=64",
    "logoSource": "google-favicon"
  },
  "linkedin": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=linkedin.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=linkedin.com&sz=64",
    "logoSource": "google-favicon"
  },
  "google-maps": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=google.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=google.com&sz=64",
    "logoSource": "google-favicon"
  },
  "adapt": {
    "officialLogoUrl": "/logos/tools/adapt.svg",
    "faviconUrl": "/logos/tools/adapt.svg",
    "logoSource": "local"
  },
  "vtuber-assistant": {
    "officialLogoUrl": "/logos/tools/vtuber-assistant.png",
    "faviconUrl": "/logos/tools/vtuber-assistant.png",
    "logoSource": "local"
  },
  "resumedit": {
    "officialLogoUrl": "/logos/tools/resumedit.svg",
    "faviconUrl": "/logos/tools/resumedit.svg",
    "logoSource": "local"
  },
  "thrive-financial": {
    "officialLogoUrl": "/logos/tools/thrive-financial.svg",
    "faviconUrl": "/logos/tools/thrive-financial.svg",
    "logoSource": "local"
  },
  "mycustodycoach": {
    "officialLogoUrl": "/logos/tools/mycustodycoach.svg",
    "faviconUrl": "/logos/tools/mycustodycoach.svg",
    "logoSource": "local"
  },
  "fastiads": {
    "officialLogoUrl": "/logos/tools/fastiads.png",
    "faviconUrl": "/logos/tools/fastiads.png",
    "logoSource": "local"
  },
  "ufate": {
    "officialLogoUrl": "/logos/tools/ufate.svg",
    "faviconUrl": "/logos/tools/ufate.svg",
    "logoSource": "local"
  },
  "pngmaker": {
    "officialLogoUrl": "/logos/tools/pngmaker.png",
    "faviconUrl": "/logos/tools/pngmaker.png",
    "logoSource": "local"
  },
  "apiposture": {
    "officialLogoUrl": "/logos/tools/apiposture.svg",
    "faviconUrl": "/logos/tools/apiposture.svg",
    "logoSource": "local"
  },
  "buddypro": {
    "officialLogoUrl": "/logos/tools/buddypro.svg",
    "faviconUrl": "/logos/tools/buddypro.svg",
    "logoSource": "local"
  },
  "plotstudio-ai": {
    "officialLogoUrl": "/logos/tools/plotstudio-ai.svg",
    "faviconUrl": "/logos/tools/plotstudio-ai.svg",
    "logoSource": "local"
  },
  "general-compute": {
    "officialLogoUrl": "/logos/tools/general-compute.svg",
    "faviconUrl": "/logos/tools/general-compute.svg",
    "logoSource": "local"
  },
  "franki": {
    "officialLogoUrl": "/logos/tools/franki.svg",
    "faviconUrl": "/logos/tools/franki.svg",
    "logoSource": "local"
  },
  "teachquill": {
    "officialLogoUrl": "/logos/tools/teachquill.svg",
    "faviconUrl": "/logos/tools/teachquill.svg",
    "logoSource": "local"
  },
  "wearmind": {
    "officialLogoUrl": "/logos/tools/wearmind.svg",
    "faviconUrl": "/logos/tools/wearmind.svg",
    "logoSource": "local"
  },
  "openbudget": {
    "officialLogoUrl": "/logos/tools/openbudget.svg",
    "faviconUrl": "/logos/tools/openbudget.svg",
    "logoSource": "local"
  },
  "imaginego": {
    "officialLogoUrl": "/logos/tools/imaginego.svg",
    "faviconUrl": "/logos/tools/imaginego.svg",
    "logoSource": "local"
  },
  "edusolver": {
    "officialLogoUrl": "/logos/tools/edusolver.svg",
    "faviconUrl": "/logos/tools/edusolver.svg",
    "logoSource": "local"
  },
  "beyondcomments": {
    "officialLogoUrl": "/logos/tools/beyondcomments.svg",
    "faviconUrl": "/logos/tools/beyondcomments.svg",
    "logoSource": "local"
  },
  "bookcoverslab": {
    "officialLogoUrl": "/logos/tools/bookcoverslab.svg",
    "faviconUrl": "/logos/tools/bookcoverslab.svg",
    "logoSource": "local"
  },
  "ndorflow": {
    "officialLogoUrl": "/logos/tools/ndorflow.png",
    "faviconUrl": "/logos/tools/ndorflow.png",
    "logoSource": "local"
  },
  "melody-genie": {
    "officialLogoUrl": "/logos/tools/melody-genie.png",
    "faviconUrl": "/logos/tools/melody-genie.png",
    "logoSource": "local"
  },
  "makeform": {
    "officialLogoUrl": "/logos/tools/makeform.svg",
    "faviconUrl": "/logos/tools/makeform.svg",
    "logoSource": "local"
  },
  "catdoes": {
    "officialLogoUrl": "/logos/tools/catdoes.png",
    "faviconUrl": "/logos/tools/catdoes.png",
    "logoSource": "local"
  },
  "webzum": {
    "officialLogoUrl": "/logos/tools/webzum.svg",
    "faviconUrl": "/logos/tools/webzum.svg",
    "logoSource": "local"
  },
  "fliesreplies": {
    "officialLogoUrl": "/logos/tools/fliesreplies.png",
    "faviconUrl": "/logos/tools/fliesreplies.png",
    "logoSource": "local"
  },
  "gamelabs-studio": {
    "officialLogoUrl": "/logos/tools/gamelabs-studio.png",
    "faviconUrl": "/logos/tools/gamelabs-studio.png",
    "logoSource": "local"
  },
  "shortsmate": {
    "officialLogoUrl": "/logos/tools/shortsmate.svg",
    "faviconUrl": "/logos/tools/shortsmate.svg",
    "logoSource": "local"
  },
  "asteroid-ai": {
    "officialLogoUrl": "/logos/tools/asteroid-ai.svg",
    "faviconUrl": "/logos/tools/asteroid-ai.svg",
    "logoSource": "local"
  },
  "adrian": {
    "officialLogoUrl": "/logos/tools/adrian.png",
    "faviconUrl": "/logos/tools/adrian.png",
    "logoSource": "local"
  },
  "ceofriend": {
    "officialLogoUrl": "/logos/tools/ceofriend.svg",
    "faviconUrl": "/logos/tools/ceofriend.svg",
    "logoSource": "local"
  },
  "distill-cv": {
    "officialLogoUrl": "/logos/tools/distill-cv.svg",
    "faviconUrl": "/logos/tools/distill-cv.svg",
    "logoSource": "local"
  },
  "image3d-ai": {
    "officialLogoUrl": "/logos/tools/image3d-ai.svg",
    "faviconUrl": "/logos/tools/image3d-ai.svg",
    "logoSource": "local"
  },
  "lyricmv": {
    "officialLogoUrl": "/logos/tools/lyricmv.png",
    "faviconUrl": "/logos/tools/lyricmv.png",
    "logoSource": "local"
  },
  "matrix-coder": {
    "officialLogoUrl": "/logos/tools/matrix-coder.svg",
    "faviconUrl": "/logos/tools/matrix-coder.svg",
    "logoSource": "local"
  },
  "notis": {
    "officialLogoUrl": "/logos/tools/notis.svg",
    "faviconUrl": "/logos/tools/notis.svg",
    "logoSource": "local"
  },
  "thumbs-ai": {
    "officialLogoUrl": "/logos/tools/thumbs-ai.svg",
    "faviconUrl": "/logos/tools/thumbs-ai.svg",
    "logoSource": "local"
  },
  "homerestyle-ai": {
    "officialLogoUrl": "/logos/tools/homerestyle-ai.svg",
    "faviconUrl": "/logos/tools/homerestyle-ai.svg",
    "logoSource": "local"
  },
  "videoswap-app": {
    "officialLogoUrl": "/logos/tools/videoswap-app.svg",
    "faviconUrl": "/logos/tools/videoswap-app.svg",
    "logoSource": "local"
  },
  "socialclip-studio": {
    "officialLogoUrl": "/logos/tools/socialclip-studio.png",
    "faviconUrl": "/logos/tools/socialclip-studio.png",
    "logoSource": "local"
  },
  "appdeploy": {
    "officialLogoUrl": "/logos/tools/appdeploy.png",
    "faviconUrl": "/logos/tools/appdeploy.png",
    "logoSource": "local"
  },
  "coursebox": {
    "officialLogoUrl": "/logos/tools/coursebox.svg",
    "faviconUrl": "/logos/tools/coursebox.svg",
    "logoSource": "local"
  },
  "baby-magic": {
    "officialLogoUrl": "/logos/tools/baby-magic.png",
    "faviconUrl": "/logos/tools/baby-magic.png",
    "logoSource": "local"
  },
  "betterspace": {
    "officialLogoUrl": "/logos/tools/betterspace.svg",
    "faviconUrl": "/logos/tools/betterspace.svg",
    "logoSource": "local"
  },
  "geeklink": {
    "officialLogoUrl": "/logos/tools/geeklink.svg",
    "faviconUrl": "/logos/tools/geeklink.svg",
    "logoSource": "local"
  },
  "hitpublish": {
    "officialLogoUrl": "/logos/tools/hitpublish.svg",
    "faviconUrl": "/logos/tools/hitpublish.svg",
    "logoSource": "local"
  },
  "audio-transcriber-ai": {
    "officialLogoUrl": "/logos/tools/audio-transcriber-ai.svg",
    "faviconUrl": "/logos/tools/audio-transcriber-ai.svg",
    "logoSource": "local"
  },
  "globalpayex": {
    "officialLogoUrl": "/logos/tools/globalpayex.svg",
    "faviconUrl": "/logos/tools/globalpayex.svg",
    "logoSource": "local"
  },
  "ask-bishop": {
    "officialLogoUrl": "/logos/tools/ask-bishop.svg",
    "faviconUrl": "/logos/tools/ask-bishop.svg",
    "logoSource": "local"
  },
  "quorlyx-pro": {
    "officialLogoUrl": "/logos/tools/quorlyx-pro.png",
    "faviconUrl": "/logos/tools/quorlyx-pro.png",
    "logoSource": "local"
  },
  "scavio-ai": {
    "officialLogoUrl": "/logos/tools/scavio-ai.svg",
    "faviconUrl": "/logos/tools/scavio-ai.svg",
    "logoSource": "local"
  },
  "dinecraft": {
    "officialLogoUrl": "/logos/tools/dinecraft.svg",
    "faviconUrl": "/logos/tools/dinecraft.svg",
    "logoSource": "local"
  },
  "teneks": {
    "officialLogoUrl": "/logos/tools/teneks.svg",
    "faviconUrl": "/logos/tools/teneks.svg",
    "logoSource": "local"
  },
  "webcrawler-api": {
    "officialLogoUrl": "/logos/tools/webcrawler-api.png",
    "faviconUrl": "/logos/tools/webcrawler-api.png",
    "logoSource": "local"
  },
  "team-pulse": {
    "officialLogoUrl": "/logos/tools/team-pulse.png",
    "faviconUrl": "/logos/tools/team-pulse.png",
    "logoSource": "local"
  },
  "browserbeam": {
    "officialLogoUrl": "/logos/tools/browserbeam.svg",
    "faviconUrl": "/logos/tools/browserbeam.svg",
    "logoSource": "local"
  },
  "authentalink": {
    "officialLogoUrl": "/logos/tools/authentalink.svg",
    "faviconUrl": "/logos/tools/authentalink.svg",
    "logoSource": "local"
  },
  "unframe-ai": {
    "officialLogoUrl": "/logos/tools/unframe-ai.svg",
    "faviconUrl": "/logos/tools/unframe-ai.svg",
    "logoSource": "local"
  },
  "introvrs": {
    "officialLogoUrl": "/logos/tools/introvrs.svg",
    "faviconUrl": "/logos/tools/introvrs.svg",
    "logoSource": "local"
  },
  "modelatlas": {
    "officialLogoUrl": "/logos/tools/modelatlas.svg",
    "faviconUrl": "/logos/tools/modelatlas.svg",
    "logoSource": "local"
  },
  "textsongai-com": {
    "officialLogoUrl": "/logos/tools/textsongai-com.svg",
    "faviconUrl": "/logos/tools/textsongai-com.svg",
    "logoSource": "local"
  },
  "nomie": {
    "officialLogoUrl": "/logos/tools/nomie.png",
    "faviconUrl": "/logos/tools/nomie.png",
    "logoSource": "local"
  },
  "clocsy": {
    "officialLogoUrl": "/logos/tools/clocsy.png",
    "faviconUrl": "/logos/tools/clocsy.png",
    "logoSource": "local"
  },
  "pounce": {
    "officialLogoUrl": "/logos/tools/pounce.png",
    "faviconUrl": "/logos/tools/pounce.png",
    "logoSource": "local"
  },
  "facehub-ai": {
    "officialLogoUrl": "/logos/tools/facehub-ai.svg",
    "faviconUrl": "/logos/tools/facehub-ai.svg",
    "logoSource": "local"
  },
  "cloudcontact-ai": {
    "officialLogoUrl": "/logos/tools/cloudcontact-ai.svg",
    "faviconUrl": "/logos/tools/cloudcontact-ai.svg",
    "logoSource": "local"
  },
  "ugo": {
    "officialLogoUrl": "/logos/tools/ugo.svg",
    "faviconUrl": "/logos/tools/ugo.svg",
    "logoSource": "local"
  },
  "ai-product-photography-app": {
    "officialLogoUrl": "/logos/tools/ai-product-photography-app.svg",
    "faviconUrl": "/logos/tools/ai-product-photography-app.svg",
    "logoSource": "local"
  },
  "musvideo": {
    "officialLogoUrl": "/logos/tools/musvideo.svg",
    "faviconUrl": "/logos/tools/musvideo.svg",
    "logoSource": "local"
  },
  "patentfig-ai": {
    "officialLogoUrl": "/logos/tools/patentfig-ai.svg",
    "faviconUrl": "/logos/tools/patentfig-ai.svg",
    "logoSource": "local"
  },
  "silky-ai": {
    "officialLogoUrl": "/logos/tools/silky-ai.svg",
    "faviconUrl": "/logos/tools/silky-ai.svg",
    "logoSource": "local"
  },
  "instanttranscriber": {
    "officialLogoUrl": "/logos/tools/instanttranscriber.svg",
    "faviconUrl": "/logos/tools/instanttranscriber.svg",
    "logoSource": "local"
  },
  "magicreels": {
    "officialLogoUrl": "/logos/tools/magicreels.svg",
    "faviconUrl": "/logos/tools/magicreels.svg",
    "logoSource": "local"
  },
  "vidlogi": {
    "officialLogoUrl": "/logos/tools/vidlogi.svg",
    "faviconUrl": "/logos/tools/vidlogi.svg",
    "logoSource": "local"
  },
  "sunny-by-sunburnt-ai": {
    "officialLogoUrl": "/logos/tools/sunny-by-sunburnt-ai.svg",
    "faviconUrl": "/logos/tools/sunny-by-sunburnt-ai.svg",
    "logoSource": "local"
  },
  "floot": {
    "officialLogoUrl": "/logos/tools/floot.png",
    "faviconUrl": "/logos/tools/floot.png",
    "logoSource": "local"
  },
  "ai-landscape-design-by-yuzu": {
    "officialLogoUrl": "/logos/tools/ai-landscape-design-by-yuzu.svg",
    "faviconUrl": "/logos/tools/ai-landscape-design-by-yuzu.svg",
    "logoSource": "local"
  },
  "koinonos": {
    "officialLogoUrl": "/logos/tools/koinonos.svg",
    "faviconUrl": "/logos/tools/koinonos.svg",
    "logoSource": "local"
  },
  "debaterx": {
    "officialLogoUrl": "/logos/tools/debaterx.png",
    "faviconUrl": "/logos/tools/debaterx.png",
    "logoSource": "local"
  },
  "subquadratic": {
    "officialLogoUrl": "/logos/tools/subquadratic.svg",
    "faviconUrl": "/logos/tools/subquadratic.svg",
    "logoSource": "local"
  },
  "ozigi": {
    "officialLogoUrl": "/logos/tools/ozigi.svg",
    "faviconUrl": "/logos/tools/ozigi.svg",
    "logoSource": "local"
  },
  "rundown": {
    "officialLogoUrl": "/logos/tools/rundown.svg",
    "faviconUrl": "/logos/tools/rundown.svg",
    "logoSource": "local"
  },
  "whisper-web": {
    "officialLogoUrl": "/logos/tools/whisper-web.svg",
    "faviconUrl": "/logos/tools/whisper-web.svg",
    "logoSource": "local"
  },
  "prosed": {
    "officialLogoUrl": "/logos/tools/prosed.svg",
    "faviconUrl": "/logos/tools/prosed.svg",
    "logoSource": "local"
  },
  "ask-the-record": {
    "officialLogoUrl": "/logos/tools/ask-the-record.svg",
    "faviconUrl": "/logos/tools/ask-the-record.svg",
    "logoSource": "local"
  },
  "astrocarto": {
    "officialLogoUrl": "/logos/tools/astrocarto.png",
    "faviconUrl": "/logos/tools/astrocarto.png",
    "logoSource": "local"
  },
  "optihedge": {
    "officialLogoUrl": "/logos/tools/optihedge.svg",
    "faviconUrl": "/logos/tools/optihedge.svg",
    "logoSource": "local"
  },
  "songmuse-ai": {
    "officialLogoUrl": "/logos/tools/songmuse-ai.svg",
    "faviconUrl": "/logos/tools/songmuse-ai.svg",
    "logoSource": "local"
  },
  "ai-image-2-video": {
    "officialLogoUrl": "/logos/tools/ai-image-2-video.png",
    "faviconUrl": "/logos/tools/ai-image-2-video.png",
    "logoSource": "local"
  },
  "speedpainter": {
    "officialLogoUrl": "/logos/tools/speedpainter.svg",
    "faviconUrl": "/logos/tools/speedpainter.svg",
    "logoSource": "local"
  },
  "rfp-ai": {
    "officialLogoUrl": "/logos/tools/rfp-ai.svg",
    "faviconUrl": "/logos/tools/rfp-ai.svg",
    "logoSource": "local"
  },
  "live-like-the-river": {
    "officialLogoUrl": "/logos/tools/live-like-the-river.svg",
    "faviconUrl": "/logos/tools/live-like-the-river.svg",
    "logoSource": "local"
  },
  "groundscholar": {
    "officialLogoUrl": "/logos/tools/groundscholar.svg",
    "faviconUrl": "/logos/tools/groundscholar.svg",
    "logoSource": "local"
  },
  "paraspeech": {
    "officialLogoUrl": "/logos/tools/paraspeech.svg",
    "faviconUrl": "/logos/tools/paraspeech.svg",
    "logoSource": "local"
  },
  "babelbeez": {
    "officialLogoUrl": "/logos/tools/babelbeez.svg",
    "faviconUrl": "/logos/tools/babelbeez.svg",
    "logoSource": "local"
  },
  "vertech-academy": {
    "officialLogoUrl": "/logos/tools/vertech-academy.png",
    "faviconUrl": "/logos/tools/vertech-academy.png",
    "logoSource": "local"
  },
  "vireel-ai-image-to-video-generator": {
    "officialLogoUrl": "/logos/tools/vireel-ai-image-to-video-generator.svg",
    "faviconUrl": "/logos/tools/vireel-ai-image-to-video-generator.svg",
    "logoSource": "local"
  },
  "ai-aware": {
    "officialLogoUrl": "",
    "faviconUrl": "",
    "logoSource": "generated-fallback"
  },
  "madefine-ai": {
    "officialLogoUrl": "/logos/tools/madefine-ai.svg",
    "faviconUrl": "/logos/tools/madefine-ai.svg",
    "logoSource": "local"
  },
  "lyric-remix-studio": {
    "officialLogoUrl": "/logos/tools/lyric-remix-studio.png",
    "faviconUrl": "/logos/tools/lyric-remix-studio.png",
    "logoSource": "local"
  },
  "nesttrack": {
    "officialLogoUrl": "/logos/tools/nesttrack.svg",
    "faviconUrl": "/logos/tools/nesttrack.svg",
    "logoSource": "local"
  },
  "dashjob-ai": {
    "officialLogoUrl": "/logos/tools/dashjob-ai.png",
    "faviconUrl": "/logos/tools/dashjob-ai.png",
    "logoSource": "local"
  },
  "lobbystack": {
    "officialLogoUrl": "/logos/tools/lobbystack.svg",
    "faviconUrl": "/logos/tools/lobbystack.svg",
    "logoSource": "local"
  },
  "vibebot": {
    "officialLogoUrl": "/logos/tools/vibebot.svg",
    "faviconUrl": "/logos/tools/vibebot.svg",
    "logoSource": "local"
  },
  "describethat": {
    "officialLogoUrl": "/logos/tools/describethat.png",
    "faviconUrl": "/logos/tools/describethat.png",
    "logoSource": "local"
  },
  "colorjibe": {
    "officialLogoUrl": "/logos/tools/colorjibe.svg",
    "faviconUrl": "/logos/tools/colorjibe.svg",
    "logoSource": "local"
  },
  "kairval": {
    "officialLogoUrl": "/logos/tools/kairval.png",
    "faviconUrl": "/logos/tools/kairval.png",
    "logoSource": "local"
  },
  "himedia": {
    "officialLogoUrl": "/logos/tools/himedia.png",
    "faviconUrl": "/logos/tools/himedia.png",
    "logoSource": "local"
  },
  "ai-photo-editor": {
    "officialLogoUrl": "/logos/tools/ai-photo-editor.svg",
    "faviconUrl": "/logos/tools/ai-photo-editor.svg",
    "logoSource": "local"
  },
  "viyou-ai-motion-control": {
    "officialLogoUrl": "/logos/tools/viyou-ai-motion-control.svg",
    "faviconUrl": "/logos/tools/viyou-ai-motion-control.svg",
    "logoSource": "local"
  },
  "creen-ai": {
    "officialLogoUrl": "/logos/tools/creen-ai.png",
    "faviconUrl": "/logos/tools/creen-ai.png",
    "logoSource": "local"
  },
  "ai-kiss": {
    "officialLogoUrl": "/logos/tools/ai-kiss.svg",
    "faviconUrl": "/logos/tools/ai-kiss.svg",
    "logoSource": "local"
  },
  "voooai": {
    "officialLogoUrl": "/logos/tools/voooai.svg",
    "faviconUrl": "/logos/tools/voooai.svg",
    "logoSource": "local"
  },
  "music-video-generator": {
    "officialLogoUrl": "/logos/tools/music-video-generator.png",
    "faviconUrl": "/logos/tools/music-video-generator.png",
    "logoSource": "local"
  },
  "cleanvideoai-watermark-removal": {
    "officialLogoUrl": "/logos/tools/cleanvideoai-watermark-removal.svg",
    "faviconUrl": "/logos/tools/cleanvideoai-watermark-removal.svg",
    "logoSource": "local"
  },
  "tendem": {
    "officialLogoUrl": "/logos/tools/tendem.svg",
    "faviconUrl": "/logos/tools/tendem.svg",
    "logoSource": "local"
  },
  "rusheslab": {
    "officialLogoUrl": "/logos/tools/rusheslab.svg",
    "faviconUrl": "/logos/tools/rusheslab.svg",
    "logoSource": "local"
  },
  "fineshare-sora-watermark-remover": {
    "officialLogoUrl": "/logos/tools/fineshare-sora-watermark-remover.png",
    "faviconUrl": "/logos/tools/fineshare-sora-watermark-remover.png",
    "logoSource": "local"
  },
  "verdent": {
    "officialLogoUrl": "/logos/tools/verdent.png",
    "faviconUrl": "/logos/tools/verdent.png",
    "logoSource": "local"
  },
  "mixmaster-pro": {
    "officialLogoUrl": "/logos/tools/mixmaster-pro.svg",
    "faviconUrl": "/logos/tools/mixmaster-pro.svg",
    "logoSource": "local"
  },
  "slidely-ai-backed-by-yc": {
    "officialLogoUrl": "/logos/tools/slidely-ai-backed-by-yc.svg",
    "faviconUrl": "/logos/tools/slidely-ai-backed-by-yc.svg",
    "logoSource": "local"
  },
  "geoinfer": {
    "officialLogoUrl": "/logos/tools/geoinfer.svg",
    "faviconUrl": "/logos/tools/geoinfer.svg",
    "logoSource": "local"
  },
  "rocket": {
    "officialLogoUrl": "/logos/tools/rocket.svg",
    "faviconUrl": "/logos/tools/rocket.svg",
    "logoSource": "local"
  },
  "base44": {
    "officialLogoUrl": "/logos/tools/base44.svg",
    "faviconUrl": "/logos/tools/base44.svg",
    "logoSource": "local"
  },
  "biela-dev": {
    "officialLogoUrl": "/logos/tools/biela-dev.svg",
    "faviconUrl": "/logos/tools/biela-dev.svg",
    "logoSource": "local"
  },
  "unblur-image-by-uluch": {
    "officialLogoUrl": "/logos/tools/unblur-image-by-uluch.svg",
    "faviconUrl": "/logos/tools/unblur-image-by-uluch.svg",
    "logoSource": "local"
  },
  "voxdeck": {
    "officialLogoUrl": "/logos/tools/voxdeck.svg",
    "faviconUrl": "/logos/tools/voxdeck.svg",
    "logoSource": "local"
  },
  "singify-ai-vocal-remover": {
    "officialLogoUrl": "/logos/tools/singify-ai-vocal-remover.svg",
    "faviconUrl": "/logos/tools/singify-ai-vocal-remover.svg",
    "logoSource": "local"
  },
  "v03-ai-video-generator": {
    "officialLogoUrl": "/logos/tools/v03-ai-video-generator.svg",
    "faviconUrl": "/logos/tools/v03-ai-video-generator.svg",
    "logoSource": "local"
  },
  "prometai": {
    "officialLogoUrl": "/logos/tools/prometai.svg",
    "faviconUrl": "/logos/tools/prometai.svg",
    "logoSource": "local"
  },
  "archie": {
    "officialLogoUrl": "/logos/tools/archie.svg",
    "faviconUrl": "/logos/tools/archie.svg",
    "logoSource": "local"
  },
  "marblism": {
    "officialLogoUrl": "/logos/tools/marblism.png",
    "faviconUrl": "/logos/tools/marblism.png",
    "logoSource": "local"
  },
  "pixiebrix": {
    "officialLogoUrl": "/logos/tools/pixiebrix.svg",
    "faviconUrl": "/logos/tools/pixiebrix.svg",
    "logoSource": "local"
  },
  "osum": {
    "officialLogoUrl": "/logos/tools/osum.png",
    "faviconUrl": "/logos/tools/osum.png",
    "logoSource": "local"
  },
  "venturekit": {
    "officialLogoUrl": "/logos/tools/venturekit.svg",
    "faviconUrl": "/logos/tools/venturekit.svg",
    "logoSource": "local"
  },
  "photo-ai": {
    "officialLogoUrl": "/logos/tools/photo-ai.png",
    "faviconUrl": "/logos/tools/photo-ai.png",
    "logoSource": "local"
  },
  "myreport": {
    "officialLogoUrl": "/logos/tools/myreport.svg",
    "faviconUrl": "/logos/tools/myreport.svg",
    "logoSource": "local"
  },
  "resolveai": {
    "officialLogoUrl": "/logos/tools/resolveai.png",
    "faviconUrl": "/logos/tools/resolveai.png",
    "logoSource": "local"
  },
  "eightify": {
    "officialLogoUrl": "/logos/tools/eightify.svg",
    "faviconUrl": "/logos/tools/eightify.svg",
    "logoSource": "local"
  },
  "keywordsearch": {
    "officialLogoUrl": "/logos/tools/keywordsearch.svg",
    "faviconUrl": "/logos/tools/keywordsearch.svg",
    "logoSource": "local"
  },
  "stockimg-ai": {
    "officialLogoUrl": "/logos/tools/stockimg-ai.svg",
    "faviconUrl": "/logos/tools/stockimg-ai.svg",
    "logoSource": "local"
  },
  "getlogit": {
    "officialLogoUrl": "/logos/tools/getlogit.svg",
    "faviconUrl": "/logos/tools/getlogit.svg",
    "logoSource": "local"
  },
  "lxi-ai": {
    "officialLogoUrl": "/logos/tools/lxi-ai.png",
    "faviconUrl": "/logos/tools/lxi-ai.png",
    "logoSource": "local"
  },
  "pfpmaker": {
    "officialLogoUrl": "/logos/tools/pfpmaker.svg",
    "faviconUrl": "/logos/tools/pfpmaker.svg",
    "logoSource": "local"
  },
  "raplyrics": {
    "officialLogoUrl": "/logos/tools/raplyrics.svg",
    "faviconUrl": "/logos/tools/raplyrics.svg",
    "logoSource": "local"
  },
  "fetcher": {
    "officialLogoUrl": "/logos/tools/fetcher.svg",
    "faviconUrl": "/logos/tools/fetcher.svg",
    "logoSource": "local"
  },
  "watermelon": {
    "officialLogoUrl": "/logos/tools/watermelon.svg",
    "faviconUrl": "/logos/tools/watermelon.svg",
    "logoSource": "local"
  },
  "inbenta": {
    "officialLogoUrl": "/logos/tools/inbenta.svg",
    "faviconUrl": "/logos/tools/inbenta.svg",
    "logoSource": "local"
  },
  "digitalgenius": {
    "officialLogoUrl": "/logos/tools/digitalgenius.png",
    "faviconUrl": "/logos/tools/digitalgenius.png",
    "logoSource": "local"
  },
  "b12-ai-website-builder": {
    "officialLogoUrl": "/logos/tools/b12-ai-website-builder.svg",
    "faviconUrl": "/logos/tools/b12-ai-website-builder.svg",
    "logoSource": "local"
  },
  "remove-bg": {
    "officialLogoUrl": "/logos/tools/remove-bg.svg",
    "faviconUrl": "/logos/tools/remove-bg.svg",
    "logoSource": "local"
  },
  "skillroads": {
    "officialLogoUrl": "/logos/tools/skillroads.svg",
    "faviconUrl": "/logos/tools/skillroads.svg",
    "logoSource": "local"
  },
  "kavout": {
    "officialLogoUrl": "/logos/tools/kavout.png",
    "faviconUrl": "/logos/tools/kavout.png",
    "logoSource": "local"
  },
  "assemblyai": {
    "officialLogoUrl": "/logos/tools/assemblyai.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "riskified": {
    "officialLogoUrl": "/logos/tools/riskified.svg",
    "faviconUrl": "/logos/tools/riskified.svg",
    "logoSource": "local"
  },
  "datarobot": {
    "officialLogoUrl": "/logos/tools/datarobot.svg",
    "faviconUrl": "/logos/tools/datarobot.svg",
    "logoSource": "local"
  },
  "h2o-ai": {
    "officialLogoUrl": "/logos/tools/h2o-ai.svg",
    "faviconUrl": "/logos/tools/h2o-ai.svg",
    "logoSource": "local"
  },
  "deep-beat": {
    "officialLogoUrl": "/logos/tools/deep-beat.svg",
    "faviconUrl": "/logos/tools/deep-beat.svg",
    "logoSource": "local"
  },
  "deepdreamgenerator": {
    "officialLogoUrl": "/logos/tools/deepdreamgenerator.svg",
    "faviconUrl": "/logos/tools/deepdreamgenerator.svg",
    "logoSource": "local"
  },
  "ai-inspo": {
    "officialLogoUrl": "/logos/tools/ai-inspo.svg",
    "faviconUrl": "/logos/tools/ai-inspo.svg",
    "logoSource": "local"
  },
  "link-to-text": {
    "officialLogoUrl": "/logos/tools/link-to-text.svg",
    "faviconUrl": "/logos/tools/link-to-text.svg",
    "logoSource": "local"
  },
  "aiter-io": {
    "officialLogoUrl": "/logos/tools/aiter-io.png",
    "faviconUrl": "/logos/tools/aiter-io.png",
    "logoSource": "local"
  },
  "dokie": {
    "officialLogoUrl": "/logos/tools/dokie.svg",
    "faviconUrl": "/logos/tools/dokie.svg",
    "logoSource": "local"
  },
  "elevoi": {
    "officialLogoUrl": "/logos/tools/elevoi.png",
    "faviconUrl": "/logos/tools/elevoi.png",
    "logoSource": "local"
  },
  "remio": {
    "officialLogoUrl": "/logos/tools/remio.png",
    "faviconUrl": "/logos/tools/remio.png",
    "logoSource": "local"
  },
  "solyo": {
    "officialLogoUrl": "/logos/tools/solyo.svg",
    "faviconUrl": "/logos/tools/solyo.svg",
    "logoSource": "local"
  },
  "saveto-ai": {
    "officialLogoUrl": "/logos/tools/saveto-ai.svg",
    "faviconUrl": "/logos/tools/saveto-ai.svg",
    "logoSource": "local"
  },
  "vdoo-ai": {
    "officialLogoUrl": "/logos/tools/vdoo-ai.png",
    "faviconUrl": "/logos/tools/vdoo-ai.png",
    "logoSource": "local"
  },
  "vidnix": {
    "officialLogoUrl": "/logos/tools/vidnix.svg",
    "faviconUrl": "/logos/tools/vidnix.svg",
    "logoSource": "local"
  },
  "pai": {
    "officialLogoUrl": "/logos/tools/pai.svg",
    "faviconUrl": "/logos/tools/pai.svg",
    "logoSource": "local"
  },
  "ezsolve": {
    "officialLogoUrl": "/logos/tools/ezsolve.png",
    "faviconUrl": "/logos/tools/ezsolve.png",
    "logoSource": "local"
  },
  "quillbot": {
    "officialLogoUrl": "/logos/tools/quillbot.svg",
    "faviconUrl": "/logos/tools/quillbot.svg",
    "logoSource": "local"
  },
  "vismint": {
    "officialLogoUrl": "/logos/tools/vismint.svg",
    "faviconUrl": "/logos/tools/vismint.svg",
    "logoSource": "local"
  },
  "rift": {
    "officialLogoUrl": "/logos/tools/rift.svg",
    "faviconUrl": "/logos/tools/rift.svg",
    "logoSource": "local"
  },
  "airmusic": {
    "officialLogoUrl": "/logos/tools/airmusic.svg",
    "faviconUrl": "/logos/tools/airmusic.svg",
    "logoSource": "local"
  },
  "epochal": {
    "officialLogoUrl": "/logos/tools/epochal.svg",
    "faviconUrl": "/logos/tools/epochal.svg",
    "logoSource": "local"
  },
  "vidflux": {
    "officialLogoUrl": "/logos/tools/vidflux.svg",
    "faviconUrl": "/logos/tools/vidflux.svg",
    "logoSource": "local"
  },
  "redesignr-ai": {
    "officialLogoUrl": "/logos/tools/redesignr-ai.png",
    "faviconUrl": "/logos/tools/redesignr-ai.png",
    "logoSource": "local"
  },
  "veriff": {
    "officialLogoUrl": "/logos/tools/veriff.svg",
    "faviconUrl": "/logos/tools/veriff.svg",
    "logoSource": "local"
  },
  "ai": {
    "officialLogoUrl": "/logos/tools/ai.svg",
    "faviconUrl": "/logos/tools/ai.svg",
    "logoSource": "local"
  },
  "github-copilot": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=github.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=github.com&sz=64",
    "logoSource": "google-favicon"
  },
  "coderabbit": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=coderabbit.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=coderabbit.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "sourcegraph": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=sourcegraph.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=sourcegraph.com&sz=64",
    "logoSource": "google-favicon"
  },
  "cline": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=cline.bot&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=cline.bot&sz=64",
    "logoSource": "google-favicon"
  },
  "augment-code": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=augmentcode.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=augmentcode.com&sz=64",
    "logoSource": "google-favicon"
  },
  "qodo": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=qodo.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=qodo.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "tabnine": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=tabnine.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=tabnine.com&sz=64",
    "logoSource": "google-favicon"
  },
  "polymarket": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=polymarket.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=polymarket.com&sz=64",
    "logoSource": "google-favicon"
  },
  "kalshi": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=kalshi.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=kalshi.com&sz=64",
    "logoSource": "google-favicon"
  },
  "tradingview": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=tradingview.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=tradingview.com&sz=64",
    "logoSource": "google-favicon"
  },
  "trendspider": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=trendspider.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=trendspider.com&sz=64",
    "logoSource": "google-favicon"
  },
  "option-alpha": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=optionalpha.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=optionalpha.com&sz=64",
    "logoSource": "google-favicon"
  },
  "quantconnect": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=quantconnect.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=quantconnect.com&sz=64",
    "logoSource": "google-favicon"
  },
  "arkham": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=arkhamintelligence.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=arkhamintelligence.com&sz=64",
    "logoSource": "google-favicon"
  },
  "glassnode": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=glassnode.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=glassnode.com&sz=64",
    "logoSource": "google-favicon"
  },
  "nansen": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=nansen.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=nansen.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "defillama": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=defillama.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=defillama.com&sz=64",
    "logoSource": "google-favicon"
  },
  "messari": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=messari.io&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=messari.io&sz=64",
    "logoSource": "google-favicon"
  },
  "santiment": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=santiment.net&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=santiment.net&sz=64",
    "logoSource": "google-favicon"
  },
  "crewai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=crewai.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=crewai.com&sz=64",
    "logoSource": "google-favicon"
  },
  "gumloop": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=gumloop.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=gumloop.com&sz=64",
    "logoSource": "google-favicon"
  },
  "langflow": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=langflow.org&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=langflow.org&sz=64",
    "logoSource": "google-favicon"
  },
  "flowise": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=flowiseai.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=flowiseai.com&sz=64",
    "logoSource": "google-favicon"
  },
  "agentops": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=agentops.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=agentops.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "dify": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=dify.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=dify.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "pipedream": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=pipedream.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=pipedream.com&sz=64",
    "logoSource": "google-favicon"
  },
  "activepieces": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=activepieces.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=activepieces.com&sz=64",
    "logoSource": "google-favicon"
  },
  "workato": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=workato.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=workato.com&sz=64",
    "logoSource": "google-favicon"
  },
  "rows": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=rows.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=rows.com&sz=64",
    "logoSource": "google-favicon"
  },
  "flux-black-forest-labs": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=blackforestlabs.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=blackforestlabs.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "recraft": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=recraft.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=recraft.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "leonardo-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=leonardo.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=leonardo.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "canva-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=canva.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=canva.com&sz=64",
    "logoSource": "google-favicon"
  },
  "adobe-firefly": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=firefly.adobe.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=firefly.adobe.com&sz=64",
    "logoSource": "google-favicon"
  },
  "magnific": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=magnific.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=magnific.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "krea": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=krea.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=krea.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "freepik-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=freepik.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=freepik.com&sz=64",
    "logoSource": "google-favicon"
  },
  "playground-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=playground.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=playground.com&sz=64",
    "logoSource": "google-favicon"
  },
  "photoroom": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=photoroom.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=photoroom.com&sz=64",
    "logoSource": "google-favicon"
  },
  "openart": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=openart.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=openart.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "luma": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=lumalabs.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=lumalabs.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "veed": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=veed.io&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=veed.io&sz=64",
    "logoSource": "google-favicon"
  },
  "hedra": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=hedra.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=hedra.com&sz=64",
    "logoSource": "google-favicon"
  },
  "tavus": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=tavus.io&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=tavus.io&sz=64",
    "logoSource": "google-favicon"
  },
  "vidu": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=vidu.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=vidu.com&sz=64",
    "logoSource": "google-favicon"
  },
  "pixverse": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=pixverse.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=pixverse.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "exa": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=exa.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=exa.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "elicit": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=elicit.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=elicit.com&sz=64",
    "logoSource": "google-favicon"
  },
  "consensus": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=consensus.app&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=consensus.app&sz=64",
    "logoSource": "google-favicon"
  },
  "scite": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=scite.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=scite.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "research-rabbit": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=researchrabbit.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=researchrabbit.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "connected-papers": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=connectedpapers.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=connectedpapers.com&sz=64",
    "logoSource": "google-favicon"
  },
  "semantic-scholar": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=semanticscholar.org&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=semanticscholar.org&sz=64",
    "logoSource": "google-favicon"
  },
  "inworld": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=inworld.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=inworld.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "scenario": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=scenario.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=scenario.com&sz=64",
    "logoSource": "google-favicon"
  },
  "layer-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=layer.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=layer.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "ready-player-me": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=readyplayer.me&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=readyplayer.me&sz=64",
    "logoSource": "google-favicon"
  },
  "rosebud-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=rosebud.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=rosebud.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "ludo-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=ludo.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=ludo.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "meshy": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=meshy.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=meshy.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "tripo": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=tripo3d.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=tripo3d.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "spline": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=spline.design&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=spline.design&sz=64",
    "logoSource": "google-favicon"
  },
  "kaedim": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=kaedim3d.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=kaedim3d.com&sz=64",
    "logoSource": "google-favicon"
  },
  "polycam": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=polycam.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=polycam.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "character-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=character.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=character.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "deepbrain-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=deepbrain.io&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=deepbrain.io&sz=64",
    "logoSource": "google-favicon"
  },
  "hour-one": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=hourone.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=hourone.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "google-gemini": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64",
    "logoSource": "google-favicon"
  },
  "microsoft-copilot": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=64",
    "logoSource": "google-favicon"
  },
  "deepseek": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=deepseek.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=deepseek.com&sz=64",
    "logoSource": "google-favicon"
  },
  "meta-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=ai.meta.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=ai.meta.com&sz=64",
    "logoSource": "google-favicon"
  },
  "grammarly": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=grammarly.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=grammarly.com&sz=64",
    "logoSource": "google-favicon"
  },
  "dall-e": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=openai.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=openai.com&sz=64",
    "logoSource": "google-favicon"
  },
  "stable-diffusion": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=stability.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=stability.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "hugging-face": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=huggingface.co&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=huggingface.co&sz=64",
    "logoSource": "google-favicon"
  },
  "openai-platform": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=platform.openai.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=platform.openai.com&sz=64",
    "logoSource": "google-favicon"
  },
  "anthropic-console": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=console.anthropic.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=console.anthropic.com&sz=64",
    "logoSource": "google-favicon"
  },
  "langchain": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=langchain.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=langchain.com&sz=64",
    "logoSource": "google-favicon"
  },
  "llamaindex": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=llamaindex.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=llamaindex.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "mistral-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=mistral.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=mistral.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "vertex-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=cloud.google.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=cloud.google.com&sz=64",
    "logoSource": "google-favicon"
  },
  "amazon-bedrock": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=aws.amazon.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=aws.amazon.com&sz=64",
    "logoSource": "google-favicon"
  },
  "azure-ai-foundry": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=ai.azure.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=ai.azure.com&sz=64",
    "logoSource": "google-favicon"
  },
  "databricks-mosaic-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=databricks.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=databricks.com&sz=64",
    "logoSource": "google-favicon"
  },
  "cohere": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=cohere.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=cohere.com&sz=64",
    "logoSource": "google-favicon"
  },
  "ibm-watsonx": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=ibm.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=ibm.com&sz=64",
    "logoSource": "google-favicon"
  },
  "pinecone": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=pinecone.io&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=pinecone.io&sz=64",
    "logoSource": "google-favicon"
  },
  "replicate": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=replicate.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=replicate.com&sz=64",
    "logoSource": "google-favicon"
  },
  "together-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=together.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=together.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "groq": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=groq.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=groq.com&sz=64",
    "logoSource": "google-favicon"
  },
  "fireworks-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=fireworks.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=fireworks.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "openrouter": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=openrouter.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=openrouter.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "claude-code": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=anthropic.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=anthropic.com&sz=64",
    "logoSource": "google-favicon"
  },
  "openai-codex": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=openai.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=openai.com&sz=64",
    "logoSource": "google-favicon"
  },
  "devin": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=cognition.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=cognition.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "codeium": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=codeium.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=codeium.com&sz=64",
    "logoSource": "google-favicon"
  },
  "sourcegraph-cody": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=sourcegraph.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=sourcegraph.com&sz=64",
    "logoSource": "google-favicon"
  },
  "phind": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=phind.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=phind.com&sz=64",
    "logoSource": "google-favicon"
  },
  "blackbox-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=blackbox.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=blackbox.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "weaviate": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=weaviate.io&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=weaviate.io&sz=64",
    "logoSource": "google-favicon"
  },
  "chroma": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=trychroma.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=trychroma.com&sz=64",
    "logoSource": "google-favicon"
  },
  "langsmith": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=smith.langchain.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=smith.langchain.com&sz=64",
    "logoSource": "google-favicon"
  },
  "modal": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=modal.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=modal.com&sz=64",
    "logoSource": "google-favicon"
  },
  "autogen": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=microsoft.com&sz=64",
    "logoSource": "google-favicon"
  },
  "relevance-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=relevanceai.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=relevanceai.com&sz=64",
    "logoSource": "google-favicon"
  },
  "hebbia": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=hebbia.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=hebbia.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "harvey": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=harvey.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=harvey.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "sierra": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=sierra.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=sierra.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "intercom-fin": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=intercom.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=intercom.com&sz=64",
    "logoSource": "google-favicon"
  },
  "zendesk-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=zendesk.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=zendesk.com&sz=64",
    "logoSource": "google-favicon"
  },
  "writer": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=writer.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=writer.com&sz=64",
    "logoSource": "google-favicon"
  },
  "copy-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=copy.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=copy.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "wordtune": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=wordtune.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=wordtune.com&sz=64",
    "logoSource": "google-favicon"
  },
  "figma-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=figma.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=figma.com&sz=64",
    "logoSource": "google-favicon"
  },
  "webflow-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=webflow.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=webflow.com&sz=64",
    "logoSource": "google-favicon"
  },
  "otter-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=otter.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=otter.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "fireflies-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=fireflies.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=fireflies.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "fathom": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=fathom.video&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=fathom.video&sz=64",
    "logoSource": "google-favicon"
  },
  "superhuman-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=superhuman.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=superhuman.com&sz=64",
    "logoSource": "google-favicon"
  },
  "reclaim-ai": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=reclaim.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=reclaim.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "motion": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=usemotion.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=usemotion.com&sz=64",
    "logoSource": "google-favicon"
  },
  "poe": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=poe.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=poe.com&sz=64",
    "logoSource": "google-favicon"
  },
  "you-com": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=you.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=you.com&sz=64",
    "logoSource": "google-favicon"
  },
  "ollama": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=ollama.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=ollama.com&sz=64",
    "logoSource": "google-favicon"
  },
  "lm-studio": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=lmstudio.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=lmstudio.ai&sz=64",
    "logoSource": "google-favicon"
  },
  "comfyui": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=comfy.org&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=comfy.org&sz=64",
    "logoSource": "google-favicon"
  },
  "anythingllm": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=anythingllm.com&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=anythingllm.com&sz=64",
    "logoSource": "google-favicon"
  },
  "aider": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=aider.chat&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=aider.chat&sz=64",
    "logoSource": "google-favicon"
  },
  "openhands": {
    "officialLogoUrl": "/logos/tools/openhands.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "browserbase": {
    "officialLogoUrl": "/logos/tools/browserbase.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "stagehand": {
    "officialLogoUrl": "/logos/tools/stagehand.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "deepgram": {
    "officialLogoUrl": "/logos/tools/deepgram.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "cartesia": {
    "officialLogoUrl": "/logos/tools/cartesia.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "langgraph": {
    "officialLogoUrl": "/logos/tools/langgraph.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "wordware": {
    "officialLogoUrl": "/logos/tools/wordware.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "higgsfield": {
    "officialLogoUrl": "/logos/tools/higgsfield.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "genspark": {
    "officialLogoUrl": "/logos/tools/genspark.png",
    "faviconUrl": "/logos/tools/genspark.png",
    "logoSource": "favicon"
  },
  "retell-ai": {
    "officialLogoUrl": "/logos/tools/retell-ai.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "hume-ai": {
    "officialLogoUrl": "/logos/tools/hume-ai.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "playai": {
    "officialLogoUrl": "/logos/tools/playai.png",
    "faviconUrl": "/logos/tools/playai.png",
    "logoSource": "google-favicon"
  },
  "tavily": {
    "officialLogoUrl": "/logos/tools/tavily.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "jina-ai": {
    "officialLogoUrl": "/logos/tools/jina-ai.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "voiceflow": {
    "officialLogoUrl": "/logos/tools/voiceflow.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "botpress": {
    "officialLogoUrl": "/logos/tools/botpress.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "continue-dev": {
    "officialLogoUrl": "/logos/tools/continue-dev.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "firecrawl": {
    "officialLogoUrl": "/logos/tools/firecrawl.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "crawl4ai": {
    "officialLogoUrl": "/logos/tools/crawl4ai.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "open-webui": {
    "officialLogoUrl": "/logos/tools/open-webui.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "baseten": {
    "officialLogoUrl": "/logos/tools/baseten.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "langfuse": {
    "officialLogoUrl": "/logos/tools/langfuse.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "11x": {
    "officialLogoUrl": "/logos/tools/11x.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "world-labs": {
    "officialLogoUrl": "/logos/tools/world-labs.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "mem0": {
    "officialLogoUrl": "/logos/tools/mem0.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "helicone": {
    "officialLogoUrl": "/logos/tools/helicone.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "comet": {
    "officialLogoUrl": "/logos/tools/comet.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "d-id": {
    "officialLogoUrl": "/logos/tools/d-id.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "dreamina": {
    "officialLogoUrl": "/logos/tools/dreamina.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "haiper": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=haiper.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=haiper.ai&sz=128",
    "logoSource": "google-favicon"
  },
  "hailuo": {
    "officialLogoUrl": "/logos/tools/hailuo.svg",
    "faviconUrl": "/logos/tools/hailuo.svg",
    "logoSource": "favicon"
  },
  "skyreels": {
    "officialLogoUrl": "/logos/tools/skyreels.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "bland-ai": {
    "officialLogoUrl": "/logos/tools/bland-ai.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "sesame": {
    "officialLogoUrl": "/logos/tools/sesame.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "smallest-ai": {
    "officialLogoUrl": "/logos/tools/smallest-ai.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "kagi-assistant": {
    "officialLogoUrl": "/logos/tools/kagi-assistant.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "dia-browser": {
    "officialLogoUrl": "/logos/tools/dia-browser.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "zed": {
    "officialLogoUrl": "/logos/tools/zed.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "trigger-dev": {
    "officialLogoUrl": "/logos/tools/trigger-dev.ico",
    "faviconUrl": "/logos/tools/trigger-dev.ico",
    "logoSource": "favicon"
  },
  "temporal": {
    "officialLogoUrl": "/logos/tools/temporal.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "mindsdb": {
    "officialLogoUrl": "/logos/tools/mindsdb.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "arize-phoenix": {
    "officialLogoUrl": "/logos/tools/arize-phoenix.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "weights-biases": {
    "officialLogoUrl": "/logos/tools/weights-biases.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "unstructured": {
    "officialLogoUrl": "/logos/tools/unstructured.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "llamaparse": {
    "officialLogoUrl": "/logos/tools/llamaparse.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "fellou": {
    "officialLogoUrl": "/logos/tools/fellou.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "screen-studio": {
    "officialLogoUrl": "/logos/tools/screen-studio.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "predibase": {
    "officialLogoUrl": "/logos/tools/predibase.png",
    "faviconUrl": "/logos/tools/predibase.png",
    "logoSource": "google-favicon"
  },
  "convai": {
    "officialLogoUrl": "/logos/tools/convai.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "avaturn": {
    "officialLogoUrl": "/logos/tools/avaturn.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "masterpiece-studio": {
    "officialLogoUrl": "/logos/tools/masterpiece-studio.png",
    "faviconUrl": "/logos/tools/masterpiece-studio.png",
    "logoSource": "google-favicon"
  },
  "fundraisly": {
    "officialLogoUrl": "/logos/tools/fundraisly.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "co-invest": {
    "officialLogoUrl": "/logos/tools/co-invest.png",
    "faviconUrl": "/logos/tools/co-invest.png",
    "logoSource": "google-favicon"
  },
  "paste-app": {
    "officialLogoUrl": "/logos/tools/paste-app.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "rodeo-by-twelvelabs": {
    "officialLogoUrl": "/logos/tools/rodeo-by-twelvelabs.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "branda": {
    "officialLogoUrl": "/logos/tools/branda.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "knock-agent-for-slack": {
    "officialLogoUrl": "/logos/tools/knock-agent-for-slack.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "mina-meeting-assistant": {
    "officialLogoUrl": "/logos/tools/mina-meeting-assistant.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "databox-mcp": {
    "officialLogoUrl": "/logos/tools/databox-mcp.png",
    "faviconUrl": "",
    "logoSource": "apple-touch-icon"
  },
  "dune-keypad": {
    "officialLogoUrl": "/logos/tools/dune-keypad.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "folk": {
    "officialLogoUrl": "/logos/tools/folk.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "typeahead": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=typeahead.app&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=typeahead.app&sz=128",
    "logoSource": "google-favicon"
  },
  "tokenwise": {
    "officialLogoUrl": "/logos/tools/tokenwise.jpg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "wingbits-ai": {
    "officialLogoUrl": "/logos/tools/wingbits-ai.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "openstatus-health": {
    "officialLogoUrl": "/logos/tools/openstatus-health.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "step-3-7-flash": {
    "officialLogoUrl": "/logos/tools/step-3-7-flash.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "ava-studio": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=avastudio.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=avastudio.ai&sz=128",
    "logoSource": "google-favicon"
  },
  "agent-a-ahrefs": {
    "officialLogoUrl": "/logos/tools/agent-a-ahrefs.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "mcp-bridge-appfactor": {
    "officialLogoUrl": "/logos/tools/mcp-bridge-appfactor.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "integuru": {
    "officialLogoUrl": "/logos/tools/integuru.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "basedash": {
    "officialLogoUrl": "/logos/tools/basedash.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "clipline": {
    "officialLogoUrl": "https://www.google.com/s2/favicons?domain=clipline.ai&sz=128",
    "faviconUrl": "https://www.google.com/s2/favicons?domain=clipline.ai&sz=128",
    "logoSource": "google-favicon"
  },
  "buffer-api": {
    "officialLogoUrl": "/logos/tools/buffer-api.png",
    "faviconUrl": "",
    "logoSource": "apple-touch-icon"
  },
  "zero-xyz": {
    "officialLogoUrl": "/logos/tools/zero-xyz.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "coworker-ai": {
    "officialLogoUrl": "/logos/tools/coworker-ai.svg",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "octolane": {
    "officialLogoUrl": "/logos/tools/octolane.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "krater": {
    "officialLogoUrl": "/logos/tools/krater.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "dodoform": {
    "officialLogoUrl": "/logos/tools/dodoform.ico",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "parsewise-api": {
    "officialLogoUrl": "/logos/tools/parsewise-api.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  },
  "rezonant": {
    "officialLogoUrl": "/logos/tools/rezonant.svg",
    "faviconUrl": "/logos/tools/rezonant.svg",
    "logoSource": "favicon"
  },
  "willow-scribe": {
    "officialLogoUrl": "/logos/tools/willow-scribe.png",
    "faviconUrl": "",
    "logoSource": "website-icon"
  }
};
