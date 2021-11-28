#!/bin/bash


# i commit my migration files to git so i dont need to run it on server
# ./manage.py makemigrations app_name

#run crontabs
declare -px > /tmp/.env
chmod 0644 /tmp/.env
if [ "$NODE_TYPE" == "IOT_NODE" ]
then
    node code/dist/iot.js
elif [ "$NODE_TYPE" == "EDGE_NODE" ]
then
    node code/dist/edge-server.js
else
    node code/dist/server.js
fi

# run the server
#uwsgi server.ini

# kafka consumer
