#!/bin/bash
# A API de criacao entra em throttling por conta: depois de 429 ela devolve 422
# "subdomain is not valid" por MINUTOS (mesmo nome/payload que passava antes).
# Martelar so estende. Aqui: espera longa ANTES do 1o POST, um POST por vez.
NAME="${1:-meta-rb-tcg}"
sleep 600
for i in $(seq 1 6); do
  r=$(curl -s -X POST "https://api.netlify.com/api/v1/gaiadev-pedro/sites" \
    -H "Authorization: Bearer nfp_DYcCVvjQXRMprdg9CawP4K1syEisEnR9dbae" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NAME\",\"repo\":{\"provider\":\"github\",\"repo\":\"pedroccm/riftbound-meta\",\"branch\":\"main\",\"cmd\":\"\",\"dir\":\"\",\"installation_id\":59701429}}")
  echo "$(date +%H:%M:%S) tentativa $i: $(echo "$r" | head -c 160)"
  echo "$r" | grep -q '"id"' && { echo "$r" > site.json; echo CRIADO; exit 0; }
  sleep 600
done
exit 1
