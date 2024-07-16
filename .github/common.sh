#!/bin/bash -x

ONCE_DAY='^[0-9]+ [0-9]+[^,\/]'
ONCE_WEEK='^[0-9]+ [0-9]+[^,\/] \* \* [0-7]'

once_day() {
  [ -z "$SCHEDULE" ] || [[ "$SCHEDULE" =~ $ONCE_DAY ]]
}
once_week() {
  [ -z "$SCHEDULE" ] || [[ "$SCHEDULE" =~ $ONCE_WEEK ]]
}

json_array_tolines(){
  local arr="$1"
  [ -f "$1" ] && arr=`cat $1`
    echo "$arr"|tr -d '["]'|sed -r 's/, */\n/g'
}

file_lines_tojson(){
  local uniq=0; 
  [ "$1" = '-u' ] && uniq=1 && shift;
  echo [$(echo `cat $@|if [ "$uniq" = 1 ]; then sort -u; else cat; fi|sed -r 's/(.*)/"\1"/'`|tr -s ' ' ',')]
}

filterhost() {
  local in=$1
  [ ! -s "$1" ] && echo file $1 is empty! >&2 && return
  [ -f tocheck.txt ] && rm tocheck.txt 2>/dev/null
  for d in `cat $1|sort -u`; do
    #dig +short @1.1.1.1 $d 
    ip=$(dig +short @1.1.1.1 $d | grep -v '\.$' | head -n1)
    [ ! -z "$ip" ] && echo $ip $d >> tocheck.txt
  done
  if [ -s tocheck.txt ]; then
    node .github/filterhost.mjs $2 tocheck.txt
  #else 
  #  > $1
  fi
}
