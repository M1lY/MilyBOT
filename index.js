const Discord = require('discord.js');
const client = new Discord.Client();
const config = './config.json'
const ytdl = require('ytdl-core');
const fs = require('fs');
const ytSearch = require('yt-search');
var file_content = fs.readFileSync(config);
var content = JSON.parse(file_content);
const SQLite = require("better-sqlite3");
const sql = new SQLite('./data.sqlite');
var p=false;
var s=false;
var queueEmbed = new Discord.RichEmbed();
var desc="";

global.servers = {};


client.on('ready', () => {

	const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'data';").get();
	if (!table['count(*)']) {
		sql.prepare("CREATE TABLE data (id TEXT PRIMARY KEY, moveLimit INTEGER, volume INTEGER);").run();
		sql.prepare("CREATE UNIQUE INDEX idx_data_id ON data (id);").run();
		sql.pragma("synchronous = 1");
		sql.pragma("journal_mode = wal");
	}
  	client.getData = sql.prepare("SELECT * FROM data WHERE id = ?");
  	client.setData = sql.prepare("INSERT OR REPLACE INTO data (id, moveLimit, volume) VALUES (@id, @moveLimit, @volume);");


	console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
	if (msg.author.bot) return;
	if (!msg.content.startsWith(content.prefix)) return;
	var args = msg.content.slice(content.prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();
	const member = msg.mentions.members.first();

	if (command === "obudź") {
		let data = client.getData.get(msg.guild.id);
		if(!member || !args[1]){
			msg.reply("Żeby kogoś obudź wpisz: !obudź [@nick] [ilość budzenia]");
			return;
		}
		if(!data) defaultDB(data);

		if(!member.voiceChannelID){
			msg.reply("Użytkownik nie znajduje sie na kanale głosowym");
			return;
		}else if(args[1] > getMoveLimit()){
			msg.reply("Limit budzenia to: " + getMoveLimit());
			return;
		}
		for(var i = 0; i < args[1]; i++){
			member.setVoiceChannel('520690188561940490');
			member.setVoiceChannel('481903742392729604');
		}
	}

	if (command === "usuń"){
		msg.channel.bulkDelete(++args[0]).then(() => {
			msg.channel.send("Usunięte " + --args[0] + " wiadomości").then(message => message.delete(3000));
		});
	}

	if (command === "limit"){
		let data = client.getData.get(msg.guild.id);
		if(!data) defaultDB(data);

		if(args[0] == undefined){
			msg.reply("Altualny limit budzenia to: " + getMoveLimit());
		}else if (msg.member.roles.some(r => "BotMod".includes(r.name))){
			setMoveLimit(data, args[0]);
			msg.reply("Limit budzenia został zmieniny, aktualny limit to: " + getMoveLimit());
		}else{
			msg.reply("Nie masz wystarczających uprawnień aby zmieniać limit budzenia");
		}
	}

	if (command === "summon" || command === "join"){
		if (msg.member.voiceChannel){
			if (!msg.guild.voiceConnection){
				//
				msg.member.voiceChannel.join();
				p=true;
			}else{
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
					msg.reply("Jestem tutaj!");
				}else{
					msg.reply("Jestem zajęty!");
				}
			}
		}else{
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
		}
	}

	if (command === "dc" || command === "disconnect" || command === "leave"){
		if (msg.member.voiceChannel){
			if (msg.guild.voiceConnection){
				if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
					//
					p=false;
					msg.guild.voiceConnection.disconnect();
					
					server = servers[msg.guild.id];
					server.queueURL = [];
					client.queueTITLE = [];
				}else{
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
				}
			}else{
				msg.reply("Nie jestem na żadnym kanale głosowym");
			}
		}else{
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
		}
	}

	if (command === "play" || command === "p"){
		if (msg.member.voiceChannel){
			if (!msg.guild.voiceConnection){
				if(!servers[msg.guild.id]){
					servers[msg.guild.id] = { queueURL: [], queueTITLE: [], dispatcher: [] };
				}
				msg.member.voiceChannel.join();
				p=true;
				//
			}else{
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
					//
				}else{
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			}
		}else{
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var name = args.toString().replace(/,/g,' ');
		var url;
		var title;
		if(name.startsWith("http")){
			ytdl.getInfo(name, function(err, info) {
				if (err) throw err;
				title = info.title;
				url = name;
				play(url, title);
			});
		}else{
			ytSearch(name, function ( err, r ) {
				if (err) throw err;
				const videos = r.videos;
				url = ('https://www.youtube.com' + videos[0].url);
				title = videos[0].title;
				play(url, title);
			});
		}
	}
	
	function play(url, title){
		let data = client.getData.get(msg.guild.id);
		if(!data) defaultDB(data);

		var server = servers[msg.guild.id];
		if(!server.dispatcher.speaking){
			server.dispatcher = msg.guild.voiceConnection.playStream(ytdl(url, {filter: 'audioonly'} )).on('end', () => {
				server = servers[msg.guild.id];
				if(!server.dispatcher.paused && p && !s && server.queueURL[0]){
					server.dispatcher = msg.guild.voiceConnection.playStream(ytdl(server.queueURL[0], {filter: 'audioonly'} ));
					server.dispatcher.setVolume(getVolume());
					msg.channel.send("Odtwarzam - **" + server.queueTITLE[0] + "**");
					server.queueURL.shift();
					server.queueTITLE.shift();
				};
				if(s) s=false;
			});
		}else{
			server.queueURL.push(url);
			server.queueTITLE.push(title);
			msg.channel.send("Dodałem do kolejki - **" + server.queueTITLE[server.queueTITLE.length-1] + "**");
			return;
		}
		server.dispatcher.setVolume(getVolume());
		msg.channel.send("Odtwarzam - **" + title + "**");
	}

	if (command === "pause" || command === "stop"){
		if (msg.member.voiceChannel){
			if (msg.guild.voiceConnection){
				if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
					//
				}else{
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			}else{
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		}else{
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if(server.dispatcher.speaking){
			server.dispatcher.pause();
		}else{
			msg.reply("Nic nie leci :(");
		}
	}

	if (command === "wznów" || command === "resume"){
		if (msg.member.voiceChannel){
			if (msg.guild.voiceConnection){
				if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
					//
				}else{
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			}else{
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		}else{
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if(!server.dispatcher.speaking){
			server.dispatcher.resume();
		}else{
			msg.reply("Aktualnie coś leci");
		}
	}

	if(command === "vol" || command === "volume" || command === "głośność"){
		if (msg.member.voiceChannel){
			if (msg.guild.voiceConnection){
				if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
					//
				}else{
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			}else{
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		}else{
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		let data = client.getData.get(msg.guild.id);
		if(!data) defaultDB(data);

		if(!server.dispatcher.speaking){
			msg.reply("Nic nie leci :(");
			return;
		}

		if(args[0] == undefined){
			msg.reply("Altualna głośność to: " + getVolume()*100);
			return;
		}

		
		server.dispatcher.setVolume(args[0]/100);
		setVolume(data, args[0]/100);
		msg.reply("Głośność została zmieniona na: " + data.volume*100);
	}
    
    if(command === "q" || command === "queue" || command === "kolejka"){
		if (msg.member.voiceChannel){
			if (msg.guild.voiceConnection){
				if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
					//
				}else{
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			}else{
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		}else{
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if(!server.queueTITLE[0]){
			msg.reply("Kojeka jest pusta");
			return;
		}
		desc = "";
        for(var i = 0; i < server.queueURL.length; i++){
			desc = desc + parseInt(i+1, 10) + ". [" + server.queueTITLE[i] + "]" + "(" + server.queueURL[i] + ")\n";
        }
        queueEmbed
            .setColor(3447003)
            .setTitle("Kolejka:")
            .setDescription(desc);
        msg.channel.send(queueEmbed);
	}

	if(command === "skip" || command === "s" || command === "pomiń"){
		if (msg.member.voiceChannel){
			if (msg.guild.voiceConnection){
				if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
					//
				}else{
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			}else{
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		}else{
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if(!server.dispatcher.speaking){
			msg.reply("Nic nie leci :(");
			return;
		}
		if(!server.queueURL[0]){
			msg.reply("Kolejka jest pusta");
			return;
		}
		s = true;

		server.dispatcher = msg.guild.voiceConnection.playStream(ytdl(server.queueURL[0], {filter: 'audioonly'} ));
		server.dispatcher.setVolume(getVolume());
		msg.channel.send("Odtwarzam - **" + server.queueTITLE[0] + "**");
		server.queueURL.shift();
		server.queueTITLE.shift();
	}

	if(command === "seek"){
		if (msg.member.voiceChannel){
			if (msg.guild.voiceConnection){
				if(msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name){
					//
				}else{
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			}else{
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		}else{
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if(!server.dispatcher.speaking){
			msg.reply("Nic nie leci :(");
			return;
		}

		// server.dispatcher.
	}

	function defaultDB(data) {
		data = { id: msg.guild.id, moveLimit: 5, volume: 1};
		client.setData.run(data);
	}
	function getVolume() {
		return client.getData.get(msg.guild.id).volume;
	}
	function setVolume(data, volume) {
		data.volume = volume;
		client.setData.run(data);
	}
	function getMoveLimit() {
		return client.getData.get(msg.guild.id).moveLimit;
	}
	function setMoveLimit(data, moveLimit) {
		data.moveLimit = moveLimit;
		client.setData.run(data);
	}

	if(command === "test"){
		var server = servers[msg.guild.id];
		console.log(server.dispatcher.streamOptions);
	}
});



client.login(JSON.parse(fs.readFileSync("./token.json")).token);