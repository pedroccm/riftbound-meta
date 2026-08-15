"""rift_session.py - sessao do riftdecks.com via cf_clearance (Cloudflare).

O riftdecks.com fica atras de challenge interativo do Cloudflare: curl e
curl_cffi (impersonate chrome) tomam 403. A receita que funciona e a mesma da
Liga (liga-tcg/scrapers-lojas/scrapers/liga_session.py, medida 16/07/2026):

  1. patchright, NAO playwright (o CDP vazado e o que o CF detecta);
  2. HEADFUL (headless nunca passou);
  3. channel="chrome" + launch_persistent_context (o perfil acumula confianca).

O cookie fica em rift_clearance.json (gitignored) e vale ~30-45 min a 1 dia.
O scrape.py chama ensure_session() que valida o cookie atual e re-cunha se
preciso. O cookie so funciona do MESMO IP + MESMO User-Agent que o cunhou.
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
CLEARANCE_FILE = os.path.join(HERE, "rift_clearance.json")
PROFILE_DIR = os.path.join(HERE, ".patchright_profile")

DEFAULT_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36")

BASE = "https://riftdecks.com"
# canario: a home das listagens; 200 + a palavra 'Decklists' prova cookie valido
VERIFY_URL = f"{BASE}/riftbound-decks"


def _verify(ua, cookies):
    """True se o cookie passa no site (200 + conteudo real, nao challenge)."""
    try:
        import requests
        r = requests.get(VERIFY_URL, headers={"User-Agent": ua},
                         cookies=cookies, timeout=30)
        return r.status_code == 200 and "Just a moment" not in r.text
    except Exception:
        return False


def load_session():
    """(ua, cookies) do arquivo, ou None se nao existe."""
    if not os.path.exists(CLEARANCE_FILE):
        return None
    with open(CLEARANCE_FILE, encoding="utf-8") as f:
        d = json.load(f)
    cc = (d.get("cf_clearance") or "").strip()
    if not cc:
        return None
    cookies = dict(d.get("cookies") or {})
    cookies["cf_clearance"] = cc
    return (d.get("user_agent") or DEFAULT_UA).strip(), cookies


def save_session(ua, cookies):
    d = {"user_agent": ua,
         "cf_clearance": cookies.get("cf_clearance", ""),
         "cookies": {k: v for k, v in cookies.items() if k != "cf_clearance"},
         "minted_at": time.strftime("%Y-%m-%d %H:%M:%S")}
    tmp = CLEARANCE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    os.replace(tmp, CLEARANCE_FILE)


def _click_turnstile(pg):
    """Clica no checkbox 'Confirme que e humano' do interstitial do CF.

    Diferente da Liga (challenge gerenciado, auto-passa), o riftdecks usa Turnstile
    INTERATIVO: sem clique nao sai cookie nunca. O widget vive em shadow DOM fechado
    (nao da pra query direto), mas o CONTAINER dele e um div largo de ~68px de altura
    abaixo do texto do interstitial; o checkbox fica a ~25px da borda esquerda, no
    centro vertical. Medido 13/08/2026: 2 cliques nesse ponto passaram.
    """
    try:
        box = pg.evaluate("""
          (() => {
            const ds = [...document.querySelectorAll('div')].map(e => {
              const b = e.getBoundingClientRect();
              return {x: b.x, y: b.y, w: b.width, h: b.height};
            }).filter(b => b.y > 250 && b.h >= 55 && b.h <= 80 && b.w >= 250);
            return ds.length ? ds[0] : null;
          })()
        """)
        if not box:
            return False
        cx, cy = box["x"] + 25, box["y"] + box["h"] / 2
        # aproximacao em 2 passos: mouse "humano" (chegar de longe) antes do clique
        pg.mouse.move(cx - 60, cy + 30)
        time.sleep(0.4)
        pg.mouse.move(cx, cy)
        time.sleep(0.3)
        pg.mouse.click(cx, cy)
        return True
    except Exception:
        return False


def mint(attempts=6):
    """Cunha um cf_clearance novo com patchright headful + clique no Turnstile.
    (ua, cookies) ou None."""
    try:
        from patchright.sync_api import sync_playwright
    except ImportError:
        print("[rift_session] patchright nao instalado", file=sys.stderr)
        return None
    os.makedirs(PROFILE_DIR, exist_ok=True)
    try:
        with sync_playwright() as p:
            ctx = p.chromium.launch_persistent_context(
                user_data_dir=PROFILE_DIR, channel="chrome",
                headless=False, no_viewport=True)
            try:
                pg = ctx.pages[0] if ctx.pages else ctx.new_page()
                try:
                    ua = pg.evaluate("navigator.userAgent") or DEFAULT_UA
                except Exception:
                    ua = DEFAULT_UA
                try:
                    pg.goto(VERIFY_URL, wait_until="domcontentloaded", timeout=40000)
                except Exception:
                    pass
                for _ in range(attempts):
                    time.sleep(6)
                    cks = ctx.cookies()
                    cc = next((c for c in cks if c["name"] == "cf_clearance"
                               and "riftdecks" in c["domain"]), None)
                    try:
                        title = (pg.title() or "").lower()
                    except Exception:
                        title = ""
                    if cc and "moment" not in title and "momento" not in title:
                        cookies = {c["name"]: c["value"] for c in cks
                                   if "riftdecks" in c["domain"]}
                        cookies["cf_clearance"] = cc["value"]
                        return ua, cookies
                    _click_turnstile(pg)
                return None
            finally:
                try:
                    ctx.close()
                except Exception:
                    pass
    except Exception as e:
        print(f"[rift_session] mint falhou: {type(e).__name__}: {str(e)[:160]}",
              file=sys.stderr, flush=True)
        return None


def ensure_session():
    """Sessao valida custe o que custar: arquivo -> valida -> re-cunha.
    Retorna (ua, cookies). Levanta RuntimeError se nem a cunhagem passou."""
    s = load_session()
    if s and _verify(*s):
        return s
    print("[rift_session] cookie ausente/expirado - cunhando com patchright...",
          flush=True)
    s = mint()
    if s and _verify(*s):
        save_session(*s)
        print("[rift_session] cf_clearance novo cunhado e validado", flush=True)
        return s
    raise RuntimeError("nao consegui cunhar cf_clearance valido pro riftdecks.com")


if __name__ == "__main__":
    ua, cookies = ensure_session()
    print("UA:", ua)
    print("cf_clearance:", cookies["cf_clearance"][:40] + "...")
