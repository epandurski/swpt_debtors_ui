#!/bin/sh

if [ -z "$1" ]; then
    echo "Usage: release.sh TAG"
    return
fi

echo -n "Checking whether the service worker has been updated... "
text="Version $1"
if grep -q "$text" public/sw.js; then
    echo "OK"
else
    echo
    echo "Error: public/sw.js does not contain the string '$text'."
    return
fi

swpt_debtors_ui="epandurski/swpt_debtors_ui:$1"
docker build -t "$swpt_debtors_ui" --target app-image .
git tag "v$1"
git push origin "v$1"
docker login
docker push "$swpt_debtors_ui"
