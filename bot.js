require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const FOOTBALL_API_URL = 'https://api.football-data.org/v4/teams';

// Función para buscar partidos
async function fetchMatches(teamId, competitionCode) {
  try {
    // Construir URL y cabeceras
    let url = `${FOOTBALL_API_URL}/${teamId}/matches`;
    if (competitionCode) {
      url += `?competitions=${competitionCode}`;
    }

    const response = await axios.get(url, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY },
    });

    const matches = response.data.matches;

    // Filtrar solo partidos que ocurren después de hoy
    const today = new Date().toISOString(); // Fecha actual en formato ISO 8601
    const futureMatches = matches.filter(match => match.utcDate > today);

    // Filtrar información relevante
    return futureMatches.map(match => ({
      competition: match.competition.name,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      date: match.utcDate,
      status: match.status,
    }));
  } catch (error) {
    console.error(error);
    throw new Error('No se pudieron obtener los partidos.');
  }
}

// Mapear IDs de equipos conocidos (puedes agregar más)
const TEAMS = {
  barcelona: 81,
  liverpool: 40,
  madrid: 86,
  juventus: 109,
  manunited: 66,
  arsenal: 57,
  mancity : 65,
  inter: 108,
  milan: 98,
  bayern: 5,
  dortmund: 4,
};

client.on('ready', () => {
  console.log(`¡Bot iniciado como ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'partidos') {
    // Obtener parámetros
    const team = options.getString('equipo');
    const competition = options.getString('competicion') || null;

    const teamLowerCase = team.toLowerCase();

    // Validar equipo
    if (!TEAMS[teamLowerCase]) {
      await interaction.reply(`El equipo "${team}" no está en la lista de equipos conocidos.`);
      return;
    }

    const teamId = TEAMS[teamLowerCase];

    try {
      // Buscar partidos
      const matches = await fetchMatches(teamId, competition);
      // Crear respuesta
      if (matches.length === 0) {
        await interaction.reply(`No se encontraron partidos para el equipo **${team}**${competition ? ` en la competición **${competition}**` : ''} a partir de hoy.`);
      } else {
        const reply = matches
          .slice(0, 5) // Limitar a 10 resultados
          .map(match => 
            `**${match.competition}**\n${match.homeTeam} vs ${match.awayTeam}\n📅 ${new Date(match.date).toLocaleString()} | Estado: ${match.status}`
          )
          .join('\n\n');
        await interaction.reply(reply);
      }
    } catch (error) {
      await interaction.reply('Hubo un problema al obtener los datos. Por favor, inténtalo de nuevo.');
    }
  }
});

// Registrar el comando
client.on('ready', async () => {
  const guildId = '1275838792896348190'; // ID del servidor
  const guild = client.guilds.cache.get(guildId);
  
  await guild.commands.create({
    name: 'partidos',
    description: 'Busca los partidos de un equipo.',
    options: [
      {
        name: 'equipo',
        type: 3, // STRING
        description: 'Nombre del equipo (obligatorio)',
        required: true,
      },
      {
        name: 'competicion',
        type: 3, // STRING
        description: 'Código de la competición (opcional)',
        required: false,
      },
    ],
  });

  console.log('Comando /partidos registrado.');
});

client.login(process.env.DISCORD_TOKEN);
