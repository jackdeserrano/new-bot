async function start_music(voice_channel)
    {
        if (queue.length !== 0)
        {
            var thumbnail = `https://img.youtube.com/vi/${queue[0][0].url.substring(28)}/maxresdefault.jpg`;
            var embed = new Discord.MessageEmbed()
            	.setColor('#0099ff')
            	.setTitle('Now playing')
            	.setDescription(`[${queue[0][0].title}](${queue[0][0].url})\n\nRequested by <@${queue[0][1]}>`)
            	.setThumbnail(thumbnail);
            message.channel.send(embed); 

            playing = true;
            voice_channel.join().then(connection => {
                dispatcher = connection.play(ytdl(queue[0][0].url, {filter: "audioonly"}));
                if (!voice_channels.includes(voice_channel)) voice_channels.push(voice_channel);
                dispatcher.on("finish", () => {
                    queue.shift();
                    start_music(voice_channel);
                });
            }).catch(err => {
                message.channel.send(toString(err));
                queue = [];
            }
            );
        }
        else
        {
            playing = false;
            voice_channel.leave();
        }
    }

module.exports = { start_music };