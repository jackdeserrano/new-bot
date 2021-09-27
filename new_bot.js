const Discord = require('discord.js');
const { token, guild_id } = require("./config.json");

const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const { getInfo } = require('ytdl-core');
const fs = require('fs');
const schedule = require('node-schedule');
const exec = require('child_process').execSync;

require('dotenv').config();

// https://discord.com/developers/docs/topics/gateway#list-of-intents
const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES', 'GUILD_MESSAGE_REACTIONS'] });

client.command_names = {

    'shutdown' : {

        name: 'shutdown', 
        description: 'Shut me down.',

    },

    'play' : {

        name: 'play',
        description: 'Play the audio of a specified video from YouTube.',
        options: [{
            name: 'input',
            type: 'STRING',
            description: 'A search term or URL',
            required: true
        }]

    },

    'trivia' : {

        name: 'trivia',
        description: 'Get a random trivia question to answer in 20 seconds.'

    },

    'score' : {

        name: 'score',
        description: 'See how many trivia questions you have answered correctly.'

    },

    'leaderboard' : {

        name: 'leaderboard',
        description: 'Sse the trivia leaderboard.'

    },

    'latex' : {

        name: 'latex',
        description: 'Generate an expression in LaTeX.',
        options: [{
            name: 'expression',
            type: 'STRING',
            description: 'The expression to output',
            required: true
        }]

    }

}

let bot_down = false;

let queue = [];
let voice_channels = [];
let playing = false;
let boss_id = '697622813158146138';

// default_music_channel_id = '853418925361725454';

// working with guilds before deployment

client.once('ready', async () => {

	console.log(`${client.user.username} on.`);

	client.user.setPresence({activities: [{ name: 'testing', type: 'PLAYING'}]})
	
    const app = await client.guilds.cache.get(guild_id).commands;

    const commands = await app.fetch();
    commands.forEach(command => {
        command.delete();
    });

    for (const command in client.command_names) {
        app.create(client.command_names[command]);
    }

    let boss = client.users.cache.get(boss_id);

});

const trivia = fs.readFileSync('trivia/trivia.txt').toString().split('\n\n');

client.on('interactionCreate', async interaction => {

    if (!interaction.isCommand()) return;

    if (bot_down) {
        interaction.reply({ content: 'You cannot use commands currently.', ephemeral: true });
        return;
    } 
    
    let voice_channel = client.guilds.cache.get(interaction.guildId).channels.cache./*filter((channel) => channel.type === "voice").*/get(interaction.member.voice.channelId);

    let user_id = interaction.member.user.id;

    // async function start_music(channel)
    // {
    //     if (queue.length !== 0) {

    //         var thumbnail = `https://img.youtube.com/vi/${queue[0][0].url.substring(28)}/maxresdefault.jpg`;
            
    //         var embed = new Discord.MessageEmbed()
    //             .setColor('#0099ff')
    //             .setTitle('Now playing')
    //             .setDescription(`[${queue[0][0].title}](${queue[0][0].url})\n\nRequested by <@${queue[0][1]}>`)
    //             .setThumbnail(thumbnail);

    //         interaction.editReply(embed); 

    //         playing = true;
            
            
    //         console.log(joinVoiceChannel({

    //             channelId: channel.id,
    //             guildId: channel.guild.id,
    //             adapterCreator: channel.guild.voiceAdapterCreator

    //         }));

    //         const connection = getVoiceConnection(channel.guild.id);
    //         console.log(connection);
    //         const subscription = connection.subscribe(ytdl(queue[0][0].url, { filter: 'audioonly' }));
    //         // connection.on(VoiceConnectionStatus.Ready, () => {


    //         // });
    //         //(ytdl(queue[0][0].url, { filter: 'audioonly' }));

    //         if (!voice_channels.includes(channel)) voice_channels.push(channel);
    //         dispatcher.on('finish', () => {

    //             queue.shift();
    //             start_music(channel);


    //         });
    //     } else {
    //         return;
    //     }
    // }

    try {
        // log attempted interactions to `command_log.txt`.
        var date = new Date().toISOString();
        
        var to_log = `(${interaction.guildId}) (${interaction.channel.id} ${interaction.channel.name}) (${interaction.commandName}) (${interaction.member.user.id} ${interaction.member.user.username}) (${date})\n`;

        fs.appendFile('command_log.txt', to_log, (error) => {

                if (error) throw error;
                
            });
        
        // check which interaction is called.
        switch (interaction.commandName) 
        {
            case 'shutdown':

                if (interaction.member.user.id !== '697622813158146138') {

                    await interaction.reply({ content: 'You cannot use this command.', ephemeral: true });
                    return;

                }

                await interaction.reply('Shutting down.');
                client.user.setStatus('invisible');
                bot_down = true;
                interaction.user.send('Respond with \`activate\` here to reactivate.');
                console.log(`Shutdown commenced by ${interaction.member.user.id}.`);
                return;
            
            case 'play':

                await interaction.deferReply({ ephemeral: false });

                if (!voice_channel) {

                    await interaction.editReply({ content: `Please join a voice channel that I can join.`, ephemeral: true });

                    return;
                }

                if (!interaction.guild.me.permissionsIn(voice_channel).has(0x0000100000)) {
                    
                    await interaction.editReply({ content: 'I do not have access to the voice channel you are in.' });
                    return;

                }

                let input_song = interaction.options.get('input').value;
                
                let stream = '';
                let song = {

                    title : 'name',
                    url : 'url',
                    length : 'length'

                };
                
                if (!ytdl.validateURL(input_song)) {

                    const { videos } = await yts(input_song);

                    if (!videos.length) {

                        await interaction.editReply({ content: `I cannot find any songs with the name or URL \`${input_song}\`.`, /*ephemeral: true*/ });
                        return;

                    }

                    stream = ytdl(videos[0].url, { filter: 'audioonly' });
                    
                    song.title = videos[0].title;
                    song.url = videos[0].url;
                    
                    let song_info = await ytdl.getInfo(videos[0].url);
                    song.length = song_info.videoDetails.lengthSeconds;

                } else {

                    stream = ytdl(input_song, { filter: 'audioonly' });
                    let song_info = await ytdl.getInfo(input_song);
                    song.title = song_info.videoDetails.title;
                    song.url = input_song;
                    song.length = song_info.videoDetails.lengthSeconds;

                }

                queue.push([song, user_id]);

                var thumbnail = `https://img.youtube.com/vi/${song.url.substring(28)}/maxresdefault.jpg`;

                if (playing) {
                    
                    let embed = new Discord.MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('Queued')
                        .setDescription(`[${song.title}](${song.url})\n\nRequested by <@${user_id}>`)
                        .setThumbnail(thumbnail);

                    await interaction.editReply({ embeds: [embed] });

                } else {

                    let embed = new Discord.MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('Now playing')
                        .setDescription(`[${song.title}](${song.url})\n\nRequested by <@${user_id}>`)
                        .setThumbnail(thumbnail);

                    await interaction.editReply({ embeds: [embed] });
                    return;

                } 

            case 'trivia':

                function distance(source, target) {

                    if (!source) return target ? target.length : 0;
                    
                    else if (!target) return source.length;
                
                    let m = source.length;
                    let n = target.length;
                    let INF = m + n;
                    let score = new Array(m+2);
                    let sd = {};

                    for (var i = 0; i < m + 2; i++) 
                        score[i] = new Array(n+2);

                    score[0][0] = INF;

                    for (var i = 0; i <= m; i++) {

                        score[i + 1][1] = i;
                        score[i + 1][0] = INF;
                        sd[source[i]] = 0;

                    }

                    for (var j = 0; j <= n; j++) {

                        score[1][j + 1] = j;
                        score[0][j + 1] = INF;
                        sd[target[j]] = 0;

                    }
                
                    for (var i = 1; i <= m; i++) {

                        var DB = 0;
                        for (var j = 1; j <= n; j++) {

                            let i1 = sd[target[j - 1]],
                                j1 = DB;

                            if (source[i - 1] === target[j - 1]) {

                                score[i + 1][j + 1] = score[i][j];
                                DB = j;

                            } else {

                                score[i + 1][j + 1] = Math.min(score[i][j], Math.min(score[i + 1][j], score[i][j + 1])) + 1;
                            
                            }

                            score[i + 1][j + 1] = Math.min(score[i + 1][j + 1], score[i1] ? score[i1][j1] + (i - i1 -1) + 1 + (j - j1 - 1) : Infinity);
                        }

                        sd[source[i-1]] = i;

                    }
                    return score[m+1][n+1];
                }

                await interaction.deferReply({ ephemeral: false });
                
                var index = Math.floor(Math.random() * trivia.length);
                var pair = trivia[index].split('\n');

                
                while (pair[1].includes(';') || pair[1].length > 20) {

                    var index = Math.floor(Math.random() * trivia.length);
                    var pair = trivia[index].split('\n');

                }

                const filter = m => {

                    if (!pair[1].includes(',') && !pair[1].includes('/')) {

                        let answer = pair[1].replace(/ *\([^)]*\) */g, '').toLowerCase().split(/\s+/);
                        let attempt = m.content.replace(/ *\([^)]*\) */g, '').toLowerCase().trim().split(/\s+/);

                        let is_right = true;

                        attempt.forEach(word => {

                            if (!answer.some( l => distance(l, word) < 3 )) {

                                is_right = false;
                                return;

                            }
                            
                        });

                        if (is_right) return true;

                        return false;

                    } else if (pair[1].includes('/')) {

                        let answers = pair[1].replace(/ *\([^)]*\) */g, '').toLowerCase().split('/');
                        let attempt = m.content.replace(/ *\([^)]*\) */g, '').toLowerCase().trim();

                        let is_wrong = true;

                        answers.forEach(answer => {

                            if (distance(answer, attempt) < 3) {

                                is_wrong = false;
                                return;

                            }

                        });

                        if (is_wrong) return false;

                        return true;
                        
                    } else {

                        let answer = pair[1].replace(/ *\([^)]*\) */g, '').toLowerCase().split(/,\s+/);
                        let attempt = m.content.replace(/ *\([^)]*\) */g, '').toLowerCase().trim().split(/,\s+/);
                        
                        let is_right = true;

                        attempt.forEach(word => {

                            if (!answer.some( m => (distance(m, word) < 3))) {

                                is_right = false;
                                return;

                            }
                            
                            answer.splice(answer.indexOf(word), 1);
                            
                        });

                        if (is_right) return true;

                        return false;

                    }
                    
                } 

                const collector = interaction.channel.createMessageCollector({ filter, time: 15000, max: 1 });

                interaction.editReply(pair[0]);

                var correct = false;
                
                collector.on('collect', m => {

                    fs.appendFileSync(`trivia/${m.author.id}.txt`, `0`, (error) => { 

                        if (error) throw error 
                    
                    });

                    var answerer_file = fs.readFileSync(`trivia/${m.author.id.toString()}.txt`);

                    var score = (answerer_file.toString().split('0')).length - 1;

                    interaction.followUp(`${m.author} got the correct answer: **${pair[1]}**\nScore: ${score}`);

                    correct = true;

                });

                collector.on('end', () => {

                    if (!correct) {

                        interaction.followUp(`Time is up!\nAnswer: **${pair[1]}**`);

                    }
                     
                });

                return;

            case 'score':

                await interaction.deferReply({ ephemeral: true });

                try { 

                    var answerer_file = fs.readFileSync(`trivia/${interaction.member.user.id}.txt`);
                    var score = (answerer_file.toString().split('0')).length - 1;

                    if (score === 1) {

                        await interaction.editReply(`You have answered 1 question correctly!`);

                    } else {

                        await interaction.editReply(`You have answered ${score} questions correctly!`);

                    }

                } catch {

                    await interaction.editReply(`You have not answered any questions correctly yet. Use \`/trivia\` to start playing!`);

                }

                return;

            case 'leaderboard':

                function sort_leaderboard(a, b) {

                    if (a[1] === b[1]) {

                        return 0;

                    } else {

                        return (a[1] > b[1]) ? -1 : 1;

                    }
                }

                await interaction.deferReply();

                var members = [];
                var to_delete = [];

                client.guilds.cache.get(interaction.guildId).members.cache.forEach(member => members.push([member.user]));

                var counter = 0;

                members.forEach(member => {

                    try {

                        var answerer_file = fs.readFileSync(`trivia/${member[0].id}.txt`);
                        members[counter].push((answerer_file.toString().split('0')).length - 1);

                    } catch {

                        to_delete.push(members.indexOf(member));

                    }
                    counter = counter + 1;

                });

                counter = 0;

                to_delete.forEach(index => {

                    members.splice(index - counter, 1);
                    counter = counter + 1;
                    
                });

                if (members.length === 0) {

                    await interaction.editReply(`No one has answered a question correctly yet. Use \`/trivia\` to start playing.`)
                    return;

                }

                members.sort(sort_leaderboard);

                var rankings = '';

                counter = 1

                members.forEach(member => {

                    rankings += member[1] === 1 ? `${counter}. ${member[0]} (1 answer)\n`: `${counter}. ${member[0]} (${member[1]} answers)\n`;
                    counter = counter + 1;

                });

                let leaderboard_embed = new Discord.MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('Leaderboard')
                        .setDescription(rankings);

                await interaction.editReply({ embeds: [leaderboard_embed] });
                return;

            case 'latex':

                await interaction.deferReply();    

                var tex = fs.readFileSync('tex/template.tex').toString();
                    
                tex = tex.replace('usertext', interaction.options.get('expression').value);
                
                fs.writeFileSync('./tex/output.tex', tex, (error) => {

                    if (error) throw error;

                });

                child = exec('cd tex && pdflatex output.tex | tee error.txt');

                var output = fs.readFileSync('./tex/error.txt').toString();
                
                var error = output.includes('!'); // add error checking

                if (!error) {

                    child = exec('cd tex && convert -density 1500 -size 100 -background transparent -flatten output.pdf -quality 100 -colorspace RGB output.png', { encoding: 'utf-8' }); // try getting rid of cd tex isf errorr // -resize does bad, deal with size

                    await interaction.editReply({ files: ['tex/output.png'] }); 

                } else {

                    interaction.editReply('There was a compilation error. React with ❌ to see the error.').then((message) => {

                        message.react('❌');
                        
                        const collector = message.createReactionCollector(m => true, { time: 15000, max: 1 });
                        
                        collector.on('collect', (reaction, user) => {

                            if (user.id === interaction.member.user.id && reaction.emoji.name === '❌') {

                                interaction.followUp({ files: ['./tex/error.txt'] });

                                collector.stop();

                            }

                        });

                    });

                }   

        }

    } catch (error) { 

        console.error(error);
        return interaction.editReply({ content: 'There was an error while executing this command.', ephemeral: true });

    }

});

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    // log messages to `message_log.txt`.
    let date = new Date().toISOString();
    let to_log = `(${message.guildId}) (${message.channel.id} ${message.channel.name}) (${message.author.id} ${message.author.username}) (${date})\n${message.content}\n\n`;

    fs.appendFile('message_log.txt', to_log, (error) => {

        if (error) throw error;        

    });

    // if the bot is shut down, if the message is a dm, and an allowed user attempts to activate the bot, activate the bot.
    if (bot_down && message.guildId === null && message.content === `activate` && message.author.id === '697622813158146138') {

        client.user.setStatus('online');
        bot_down = false;
        message.author.send('Success!');
        console.log(`Activation commenced by ${message.author.id}.`);

    }
    
});

client.login(token);