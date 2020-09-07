#!/usr/bin/ruby
require 'pp'
require 'json'
require 'thread'
require 'pubnub'


@trapped_smoke_signal = false
@trapped_co_signal = false

# Test with 'kill -SIGUSR1 <pid>'
class AlarmNotifications

  # initialize the pubnub object
  def initialize ()
    config = File.open('/mnt/data/pubnub_channel.txt', 'r').readlines()

    pk = File.open(File.exists?('/mnt/data/pub_pk.txt') ? '/mnt/data/pub_pk.txt' : '/usr/lib/leeonl/customer_image/leeo_services/pub_pk.cfg', 'r').readlines()
    sk =  File.open(File.exists?('/mnt/data/pub_sk.txt') ? '/mnt/data/pub_sk.txt' : '/usr/lib/leeonl/customer_image/leeo_services/pub_sk.cfg', 'r').readlines()

    @channel_name = config[0].strip
    @publish_key = pk[0].strip
    @subscribe_key = sk[0].strip


    @pubnub = Pubnub.new(
        :publish_key    => @publish_key,
        :subscribe_key  => @subscribe_key,
    )
  end

  # send message to user
  def msg_send(type)

    input_message = {
        "type" => "record-alarm", # Sensor reading
        "alarm" => "smoke", # Current time (reading time)
    }.to_json

    if type == "co"
      input_message = {
          "type" => "record-alarm", # Sensor reading
          "alarm" => "co", # Current time (reading time)
      }.to_json
    end

    @pubnub.publish(
        :channel  => @channel_name,
        :message  => input_message,
        :callback => lambda {|message| puts "Sent Message: message" +input_message.inspect + "\nResponse:" + message.inspect}
    )
  end

  def issue_warning(type)

    input_message = {
        "type" => "issue-danger", # Sensor reading
        "sensor_type" => "smoke", # Current time (reading time)
    }.to_json

    if type == "co"
      input_message = {
          "type" => "issue-danger", # Sensor reading
          "sensor_type" => "co", # Current time (reading time)
      }.to_json
    end

    @pubnub.publish(
        :channel  => @channel_name,
        :message  => input_message,
        :callback => lambda {|message| puts "Sent Message: message" +input_message.inspect + "\nResponse:" + message.inspect}
    )
  end
end

notify = AlarmNotifications.new

# Capture smoke alarm signals
trap("SIGUSR1") do
  @trapped_smoke_signal = true
end

trap("SIGUSR2") do
  @trapped_co_signal = true
end

thread_list = []
thread_list << Thread.new {
  while true do
    if @trapped_smoke_signal
      puts 'Found Smoke.'
      notify.issue_warning("smoke")
      notify.msg_send("smoke")
      @trapped_smoke_signal = false
    end
    if @trapped_co_signal
      puts 'CO Smoke.'
      notify.issue_warning("co")
      notify.msg_send("co")
      @trapped_co_signal = false
      File.exists?('/mnt/data/pub_sk.txt') ? '/mnt/data/pub_sk.txt' : '/usr/lib/leeonl/customer_image/leeo_services/pub_sk.cfg'    end
    sleep(1)
  end
}

thread_list.each { |x| x.join } # allow each thread to run to completion

