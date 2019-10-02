
FILENAME=$1

git log --format="commit %H%nauthor %aN%ndate %cd%nmessage %s" --date=short --date-order --follow --name-only -- "${FILENAME}" > commit-history.txt
