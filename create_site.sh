#!/bin/bash
# retry ate a API do Netlify liberar (429 = rate limit de criacao)
for i in 1 2 3 4 5 6; do
  r=$(curl -s -X POST "https://api.netlify.com/api/v1/gaiadev-pedro/sites" \
    -H "Authorization: Bearer nfp_DYcCVvjQXRMprdg9CawP4K1syEisEnR9dbae" \
    -H "Content-Type: application/json" \
    -d '{"name":"riftbound-meta-app","repo":{"provider":"github","repo":"pedroccm/riftbound-meta","branch":"main","cmd":"cp ../riftbound.db ./riftbound.db && npm run build","dir":".next","base":"web","installation_id":59701429}}')
  echo "tentativa $i: $(echo "$r" | head -c 300)"
  echo "$r" | grep -q '"id"' && { echo "$r" > site.json; echo CRIADO; exit 0; }
  echo "$r" | grep -q '429' || exit 1
  sleep 60
done
exit 1
