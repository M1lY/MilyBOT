// "ffmpeg-binaries": "^4.0.0",
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
var p = false;
var s = false;
var desc = "";

global.servers = {};


client.on('ready', () => {
	client.user.setActivity("Użyj !help");

	const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'data';").get();
	if (!table['count(*)']) {
		sql.prepare("CREATE TABLE data (id TEXT PRIMARY KEY, moveLimit INTEGER, volume INTEGER, moveCH1 TEXT, moveCH2 TEXT, mod TEXT);").run();
		sql.prepare("CREATE UNIQUE INDEX idx_data_id ON data (id);").run();
		sql.pragma("synchronous = 1");
		sql.pragma("journal_mode = wal");
	}
	client.getData = sql.prepare("SELECT * FROM data WHERE id = ?");
	client.setData = sql.prepare("INSERT OR REPLACE INTO data (id, moveLimit, volume, moveCH1, moveCH2, mod) VALUES (@id, @moveLimit, @volume, @moveCH1, @moveCH2, @mod);");


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
		if (!member || !args[1] || !isNaN(args[0])) {
			msg.reply("Żeby kogoś obudzić wpisz: !obudź <@nick> <ilość przeniesień>");
			return;
		}
		if (!data) defaultDB(data);

		const CH1 = getMoveCH1();
		const CH2 = getMoveCH2();
		if (CH1 == "" || CH2 == "") {
			msg.reply("Kanały między którymi użytkownik będzie przenoszony podczas \"budzenia\" nie zostały jeszcze ustanione\nAby to zrobić wpisz: !obudźKanały <pozycja kanału głosowego 1> <pozycja kanału głosowego 2>**")
		}
		if (!member.voiceChannelID) {
			msg.reply("Użytkownik nie znajduje sie na kanale głosowym");
			return;
		} else if (args[1] > getMoveLimit()) {
			msg.reply("Limit budzenia to: " + getMoveLimit());
			return;
		}
		const startChannel = member.voiceChannelID;
		for (var i = 0; i < args[1]; i++) {
			member.setVoiceChannel(CH1);
			member.setVoiceChannel(CH2);
		}
		member.setVoiceChannel(startChannel);
	}

	if (command === "usuń" || command === "delete") {
		msg.channel.bulkDelete(++args[0]).then(() => {
			msg.channel.send("Usunięte " + --args[0] + " wiadomości").then(message => message.delete(3000));
		});
	}

	if (command === "limit") {
		let data = client.getData.get(msg.guild.id);
		if (!data) defaultDB(data);

		if (args[0] == undefined) {
			msg.reply("Altualny limit budzenia to: " + getMoveLimit());
		} else if (msg.member.roles.some(r => getMod().includes(r.name)) || msg.member.hasPermission("ADMINISTRATOR")) {
			setMoveLimit(data, args[0]);
			msg.reply("Limit budzenia został zmieniny na: " + getMoveLimit());
		} else {
			msg.reply("Nie masz wystarczających uprawnień aby zmieniać limit budzenia");
		}
	}

	if (command === "summon" || command === "join") {
		if (msg.member.voiceChannel) {
			if (!msg.guild.voiceConnection) {
				//
				msg.member.voiceChannel.join();
				p = true;
			} else {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					msg.reply("Jestem tutaj!");
				} else {
					msg.reply("Jestem zajęty!");
				}
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
		}
	}

	if (command === "dc" || command === "disconnect" || command === "leave") {
		if (msg.member.voiceChannel) {
			if (msg.guild.voiceConnection) {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					//
					p = false;
					msg.guild.voiceConnection.disconnect();

					server = servers[msg.guild.id];
					server.queueURL = [];
					server.queueTITLE = [];
					server.nowURL = "";
					server.nowTITLE = "";
				} else {
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
				}
			} else {
				msg.reply("Nie jestem na żadnym kanale głosowym");
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
		}
	}

	if (command === "play" || command === "p") {
		if (msg.member.voiceChannel) {
			if (!msg.guild.voiceConnection) {
				if (!servers[msg.guild.id]) {
					servers[msg.guild.id] = { queueURL: [], queueTITLE: [], dispatcher: [], nowURL: "", nowTITLE: "" };
				}
				msg.member.voiceChannel.join();
				p = true;
				//
			} else {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					//
				} else {
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var name = args.toString().replace(/,/g, ' ');
		var url;
		var title;
		if (name.startsWith("http")) {
			ytdl.getInfo(name, function (err, info) {
				if (err) throw err;
				title = info.title;
				url = name;
				play(url, title);
			});
		} else {
			ytSearch(name, function (err, r) {
				if (err) throw err;
				const videos = r.videos;
				url = ('https://www.youtube.com' + videos[0].url);
				title = videos[0].title;
				play(url, title);
			});
		}
	}

	function play(url, title) {
		let data = client.getData.get(msg.guild.id);
		if (!data) defaultDB(data);

		var server = servers[msg.guild.id];
		if (!server.dispatcher.speaking) {
			server.dispatcher = msg.guild.voiceConnection.playStream(ytdl(url, { filter: 'audioonly' })).on('end', () => {
				server = servers[msg.guild.id];
				if (!server.dispatcher.paused && p && !s && server.queueURL[0]) {
					server.dispatcher = msg.guild.voiceConnection.playStream(ytdl(server.queueURL[0], { filter: 'audioonly' }));
					server.dispatcher.setVolume(getVolume());
					msg.channel.send("Odtwarzam - **" + server.queueTITLE[0] + "**");
					server.nowURL = server.queueURL[0];
					server.nowTITLE = server.queueTITLE[0];
					server.queueURL.shift();
					server.queueTITLE.shift();
				};
				if (s) s = false;
			});
		} else {
			server.queueURL.push(url);
			server.queueTITLE.push(title);
			msg.channel.send("Dodałem do kolejki - **" + server.queueTITLE[server.queueTITLE.length - 1] + "**");
			return;
		}
		server.dispatcher.setVolume(getVolume());
		msg.channel.send("Odtwarzam - **" + title + "**");
		server.nowURL = url;
		server.nowTITLE = title;
	}

	if (command === "pause" || command === "stop") {
		if (msg.member.voiceChannel) {
			if (msg.guild.voiceConnection) {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					//
				} else {
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			} else {
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if (server.dispatcher.speaking) {
			server.dispatcher.pause();
		} else {
			msg.reply("Nic nie leci :(");
		}
	}

	if (command === "wznów" || command === "resume") {
		if (msg.member.voiceChannel) {
			if (msg.guild.voiceConnection) {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					//
				} else {
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			} else {
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if (!server.dispatcher.speaking) {
			server.dispatcher.resume();
		} else {
			msg.reply("Aktualnie coś leci");
		}
	}

	if (command === "vol" || command === "volume" || command === "głośność") {
		if (msg.member.voiceChannel) {
			if (msg.guild.voiceConnection) {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					//
				} else {
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			} else {
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		let data = client.getData.get(msg.guild.id);
		if (!data) defaultDB(data);

		if (!server.dispatcher.speaking) {
			msg.reply("Nic nie leci :(");
			return;
		}

		if (args[0] == undefined) {
			msg.reply("Altualna głośność to: " + getVolume() * 100);
			return;
		}


		server.dispatcher.setVolume(args[0] / 100);
		setVolume(data, args[0] / 100);
		msg.reply("Głośność została zmieniona na: " + data.volume * 100);
	}

	if (command === "q" || command === "queue" || command === "kolejka") {
		if (msg.member.voiceChannel) {
			if (msg.guild.voiceConnection) {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					//
				} else {
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			} else {
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if (!server.queueTITLE[0]) {
			msg.reply("Kojeka jest pusta");
			return;
		}
		desc = "";
		for (var i = 0; i < server.queueURL.length; i++) {
			desc = desc + parseInt(i + 1, 10) + ". [" + server.queueTITLE[i] + "]" + "(" + server.queueURL[i] + ")\n";
		}

		var queueEmbed = new Discord.RichEmbed();
		queueEmbed
			.setColor(3447003)
			.setTitle("Kolejka:")
			.setDescription(desc);
		msg.channel.send(queueEmbed);
	}

	if (command === "skip" || command === "s" || command === "pomiń") {
		if (msg.member.voiceChannel) {
			if (msg.guild.voiceConnection) {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					//
				} else {
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			} else {
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if (!server.dispatcher.speaking) {
			msg.reply("Nic nie leci :(");
			return;
		}
		if (!server.queueURL[0]) {
			msg.reply("Kolejka jest pusta");
			return;
		}
		s = true;

		server.dispatcher = msg.guild.voiceConnection.playStream(ytdl(server.queueURL[0], { filter: 'audioonly' }));
		server.dispatcher.setVolume(getVolume());
		msg.channel.send("Odtwarzam - **" + server.queueTITLE[0] + "**");
		server.nowURL = server.queueURL[0];
		server.nowTITLE = server.queueTITLE[0];
		server.queueURL.shift();
		server.queueTITLE.shift();
	}

	if (command === "np" || command === "link" || command === "teraz") {
		if (msg.member.voiceChannel) {
			if (msg.guild.voiceConnection) {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					//
				} else {
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			} else {
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if (!server.dispatcher.speaking) {
			msg.reply("Nic nie leci :(");
			return;
		}
		if (server.nowURL) {
			msg.reply("Teraz odtwarzam: " + server.nowTITLE + " " + server.nowURL);
		}
	}

	if (command === "seek" || command === "przewiń") {
		if (msg.member.voiceChannel) {
			if (msg.guild.voiceConnection) {
				if (msg.member.voiceChannel.name === msg.guild.voiceConnection.channel.name) {
					//
				} else {
					msg.reply("Musisz być na tym samym kanale głoswym co ja zeby to zrobić");
					return;
				}
			} else {
				msg.reply("Nie jestem na żadnym kanale głosowym");
				return;
			}
		} else {
			msg.reply("Musisz dołaczyć do kanału głosowego żeby to zrobić");
			return;
		}

		var server = servers[msg.guild.id];
		if (!server.dispatcher.speaking) {
			msg.reply("Nic nie leci :(");
			return;
		}

		s = true;
		server.dispatcher = msg.guild.voiceConnection.playStream(ytdl(server.nowURL, { filter: 'audioonly' }), { seek: args[0] });
		server.dispatcher.setVolume(getVolume());
	}

	if (command === "h" || command === "help" || command === "pomoc") {
		var queueEmbed = new Discord.RichEmbed();
		queueEmbed
			.setColor(10038562)
			.setTitle("Lista komend:")
			.addField("Bot muzyczny:",
				"**!join/summon** - Przywołuje bota do twojego kanału głosowego\n" +
				"**!disconnect/leave/dc** - Odłącza bota od kanału głosowego, w którym się znajduje\n" +
				"**!play/p <url/tytuł piosenki>** - Odtwarza podany utwór\n" +
				"**!pause/stop** - Wstrzymuje aktualnie odtwarzany utwór\n" +
				"**!resume/wznów** - Wznawia wstrzymany utwór\n" +
				"**!volume/vol/głośność <100-0>** - Zmienia głośność\n" +
				"**!volume/vol/głośność** - Wyświetla głośność\n" +
				"**!queue/q/kolejka** - Wyświetla kolejkę\n" +
				"**!skip/s/pomiń** - Pomija utwór\n" +
				"**!np/link/teraz** - Wyświetla aktualnie odtwarzany utwór\n" +
				"**!seek/przewiń <czas w sekundach>** - Przewija utwór o podany czas",
				true)
			.addField("Inne:",
				"**!help/h/pomoc** - Wyświetla tą listę\n" +
				"**!delete/usuń <liczba>** - Usuwa podaną ilość ostatnich wiadomości\n" +
				"**!obudź <@nick> <ilość przeniesień>** - \"Budzi\" czyli przenosi podanego użytkownika podaną ilość razy\n" +
				"**!limit ** - Wyświetla limit przeniesień podczas \"budzenia\"\n" +
				"**!obudźKanały** - Wyświetla nazwy kanałów między którymi użytkownik będzie przenoszony podczas \"budzenia\"\n" +
				"**!moderator** - Wyświetla nazwę roli która może zarządzać ustawieniami bota",
				true)
			.addField("Ustawienia:",
				"**!limit <liczba>** - Ustawia limit przeniesień podczas \"budzenia\"\n" +
				"**!obudźKanały <pozycja kanału głosowego 1> <pozycja kanału głosowego 2>** - Ustawia kanały między którymi użytkownik będzie przenoszony podczas \"budzenia\"\n" +
				"**!moderator/mod <nazwa roli>** - (Domyślnie są to użytkownicy posiadający uprawnienie administratora) Ustawia rolę która będzie mogła zarządzać ustawieniami bota",
				true)
		msg.channel.send(queueEmbed);
	}

	if (command === "obudźkanały") {
		let data = client.getData.get(msg.guild.id);
		if (!data) defaultDB(data);

		if (getMoveCH1() == "" || getMoveCH2() == "") {
			msg.reply("Kanały między którymi użytkownik będzie przenoszony podczas \"budzenia\" nie zostały jeszcze ustawione");
			return;
		}

		if (!args[0] || !args[1]) {
			msg.reply("Kanały między którymi użytkownik będzie przenoszony podczas \"budzenia\" to: **" + getMoveCH1() + "**, **" + getMoveCH2() + "**");
			return;
		}

		const CH1 = msg.guild.channels.find(x => x.type === "voice" && x.position === parseInt(args[0] - 1));
		const CH2 = msg.guild.channels.find(x => x.type === "voice" && x.position === parseInt(args[1] - 1));

		if (msg.member.roles.some(r => getMod().includes(r.name)) || msg.member.hasPermission("ADMINISTRATOR")) {
			if (CH1 == null || CH2 == null) {
				msg.reply("Takie kanały nie istnieją");
				return;
			}
			setMoveCH1(data, CH1.id);
			setMoveCH2(data, CH2.id);
			msg.reply("Kanały między którymi użytkownik będzie przenoszony podczas \"budzenia\" zostały ustanione na: **" + CH1.name + "**,** " + CH2.name + "**");
		} else {
			msg.reply("Nie masz wystarczających uprawnień aby zmienić kanały między którymi użytkownik będzie przenoszony podczas \"budzenia\"");
		}
	}

	if (command === "moderator" || command === "mod") {
		let data = client.getData.get(msg.guild.id);
		if (!data) defaultDB(data);

		if (!getMod() && !args[0]) {
			msg.reply("Rola która może zarządzac ustawieniami bota nie została jeszcze ustawiona");
			return;
		}
		if (!args[0]) {
			msg.reply("Rola która może zarządzac ustawieniami bota to: " + getMod());
			return;
		}

		if (msg.member.roles.some(r => getMod().includes(r.name)) || msg.member.hasPermission("ADMINISTRATOR")) {
			const role = msg.guild.roles.find(x => x.name === args[0]);
			if (role != null) {
				setMod(data, role.name);
				msg.reply("Rola która może zarządzac ustawieniami bota została zmieniona na: " + getMod());
			} else {
				msg.reply("Taka rola nie istnieje");
			}
		} else {
			msg.reply("Nie masz wystarczających uprawnień aby zmienić range zarządzającą ustawieniami bota");
		}
	}

	function defaultDB(data) {
		data = { id: msg.guild.id, moveLimit: 5, volume: 1, moveCH1: "", moveCH2: "", mod: "" };
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
	function getMoveCH1() {
		return client.getData.get(msg.guild.id).moveCH1;
	}
	function setMoveCH1(data, moveCH1) {
		data.moveCH1 = moveCH1;
		client.setData.run(data);
	}
	function getMoveCH2() {
		return client.getData.get(msg.guild.id).moveCH2;
	}
	function setMoveCH2(data, moveCH2) {
		data.moveCH2 = moveCH2;
		client.setData.run(data);
	}
	function getMod() {
		return client.getData.get(msg.guild.id).mod;
	}
	function setMod(data, mod) {
		data.mod = mod;
		client.setData.run(data);
	}

	if (command === "test") {
		console.log(msg.member.permissions);
	}
});



client.login(JSON.parse(fs.readFileSync("./token.json")).token);