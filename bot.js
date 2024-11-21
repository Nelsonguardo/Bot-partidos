const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;  // Usa el puerto proporcionado por Render o el predeterminado

// Rutas básicas (puedes agregar más rutas si lo necesitas)
app.get('/', (req, res) => {
  res.send('Bot en línea');
});

// Inicia el servidor en el puerto especificado
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

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

client.on('interactionCreate', async interaction => {
  // Manejar el evento de Autocompletado
  if (interaction.isAutocomplete()) {
    const focusedOption = interaction.options.getFocused(); // Texto que el usuario está escribiendo
    const teamSuggestions = Object.keys(TEAMS); // Nombres de equipos conocidos

    // Filtrar los equipos basados en la entrada del usuario
    const filteredTeams = teamSuggestions.filter(team =>
      team.toLowerCase().startsWith(focusedOption.toLowerCase())
    );

    // Preparar las sugerencias en formato requerido
    const suggestions = filteredTeams.map(team => ({
      name: team.charAt(0).toUpperCase() + team.slice(1), // Formato: Primera letra mayúscula
      value: team, // Valor asociado (puede ser igual o distinto al texto mostrado)
    }));

    // Enviar respuesta con las sugerencias
    await interaction.respond(suggestions);
    return;
  }

  // Manejar comandos (tu código actual para el comando /partidos)
  if (interaction.isCommand()) {
    const { commandName, options } = interaction;

    if (commandName === 'partidos') {
      const team = options.getString('equipo');
      const competition = options.getString('competicion') || null;

      if (!TEAMS[team.toLowerCase()]) {
        await interaction.reply(`El equipo "${team}" no está en la lista de equipos conocidos.`);
        return;
      }

      const teamId = TEAMS[team.toLowerCase()];
      try {
        const matches = await fetchMatches(teamId, competition);

        if (matches.length === 0) {
          await interaction.reply(`No se encontraron partidos para el equipo **${team}**${competition ? ` en la competición **${competition}**` : ''} a partir de hoy.`);
        } else {
          const reply = matches
            .slice(0, 5)
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
        autocomplete: true,
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
