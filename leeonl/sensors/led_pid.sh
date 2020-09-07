#! /bin/bash

ps -ef | grep led_loop.sh | grep -v grep > led_pid.txt
read string < led_pid.txt
echo "$string" | awk '{print $2}' > led_pid.txt
read var < led_pid.txt
kill $var
