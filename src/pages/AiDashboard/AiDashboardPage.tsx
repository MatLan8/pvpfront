import React, { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

type RadarChartPayload = {
  labels: string[];
  values?: number[];
  values_mean?: number[];
  values_median?: number[];
  scale_min?: number;
  scale_max?: number;
};

type PlayerRating = {
  participant: string;
  overall_score: number;
  radar_chart?: RadarChartPayload;
  red_flags?: string[];
  actionable_next_steps?: string[];
};

type AiDashboardData = {
  game_session_summary?: {
    session_id?: string;
    notes?: string;
  };
  ratings?: PlayerRating[];
  team_level_insights?: {
    team_strengths?: string[];
    team_issues?: string[];
    recommendations?: string[];
    team_radar_chart?: RadarChartPayload;
  };
};

const formatRadarData = (labels: string[] = [], values: number[] = []) => {
  return labels.map((label, index) => ({
    skill: label,
    score: values[index] ?? 0,
  }));
};

const isDashboardData = (value: unknown): value is AiDashboardData => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as AiDashboardData;
  return Boolean(
    candidate.game_session_summary ||
      candidate.team_level_insights ||
      Array.isArray(candidate.ratings)
  );
};

const extractJsonBlock = (text: string): string => {
  const trimmed = text.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const normalizeInputToDashboardData = (rawInput: string): AiDashboardData => {
  const firstParse = JSON.parse(rawInput);

  if (isDashboardData(firstParse)) {
    return firstParse;
  }

  if (
    firstParse &&
    typeof firstParse === 'object' &&
    'response' in firstParse &&
    typeof (firstParse as { response?: unknown }).response === 'string'
  ) {
    const responseText = (firstParse as { response: string }).response;
    const extractedJson = extractJsonBlock(responseText);
    const secondParse = JSON.parse(extractedJson);

    if (isDashboardData(secondParse)) {
      return secondParse;
    }
  }

  throw new Error('Unsupported JSON structure');
};

export default function AiDashboardPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [aiData, setAiData] = useState<AiDashboardData | null>(null);
  const [error, setError] = useState('');

  const handleGenerateDashboard = () => {
    try {
      const parsedData = normalizeInputToDashboardData(jsonInput);
      setAiData(parsedData);
      setError('');
    } catch {
      setAiData(null);
      setError('❌ Invalid JSON or unsupported structure. Paste raw dashboard JSON or an object containing a response field with a JSON code block.');
    }
  };

  if (!aiData) {
    return (
      <div style={{ maxWidth: '800px', margin: '50px auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h1>📊 AI Session Analyzer</h1>
        <p>Paste your JSON response from the backend below to generate the dashboard.</p>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='Paste JSON here...'
          style={{ width: '100%', height: '300px', padding: '10px', fontFamily: 'monospace', marginBottom: '10px' }}
        />

        {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

        <button
          onClick={handleGenerateDashboard}
          style={{ padding: '10px 20px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Generate Dashboard
        </button>
      </div>
    );
  }

  const teamRadarChart = aiData.team_level_insights?.team_radar_chart;
  const teamData = teamRadarChart
    ? formatRadarData(teamRadarChart.labels, teamRadarChart.values_mean ?? teamRadarChart.values ?? [])
    : [];

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        onClick={() => setAiData(null)}
        style={{ marginBottom: '20px', padding: '5px 10px', cursor: 'pointer' }}
      >
        ← Load Different JSON
      </button>

      <h1 style={{ textAlign: 'center' }}>
        🎮 AI Session Analysis: {aiData.game_session_summary?.session_id ?? 'Unknown Session'}
      </h1>
      <p style={{ textAlign: 'center', color: '#555' }}>
        {aiData.game_session_summary?.notes ?? 'No session notes available.'}
      </p>

      <div style={{ backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '10px', marginBottom: '40px' }}>
        <h2>Team Overview</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: '1 1 400px', height: '300px' }}>
            {teamData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={teamData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={30} domain={[0, teamRadarChart?.scale_max ?? 100]} />
                  <Radar name="Team Average" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                No team radar chart data available.
              </div>
            )}
          </div>

          <div style={{ flex: '1 1 400px' }}>
            <h3>Team Strengths</h3>
            <ul>
              {(aiData.team_level_insights?.team_strengths ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <h3>Areas for Improvement</h3>
            <ul>
              {(aiData.team_level_insights?.team_issues ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <h3>AI Recommendations</h3>
            <ul>
              {(aiData.team_level_insights?.recommendations ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <h2>Player Breakdown</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
        {(aiData.ratings ?? []).map((player, index) => {
          const labels = player.radar_chart?.labels ?? [];
          const values = player.radar_chart?.values ?? [];
          const playerData = formatRadarData(labels, values);
          const scoreColor =
            player.overall_score > 60 ? '#4caf50' : player.overall_score > 40 ? '#ff9800' : '#f44336';

          return (
            <div key={index} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>{player.participant}</h2>
                <h2 style={{ margin: 0, color: scoreColor }}>{player.overall_score} / 100</h2>
              </div>

              <div style={{ height: '250px', marginTop: '20px' }}>
                {playerData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={playerData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, player.radar_chart?.scale_max ?? 100]} tick={false} />
                      <Radar name={player.participant} dataKey="score" stroke={scoreColor} fill={scoreColor} fillOpacity={0.5} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                    No player radar chart data available.
                  </div>
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <p><strong>🚨 Red Flags:</strong> {(player.red_flags ?? []).join(' ') || 'None listed.'}</p>
                <p><strong>✅ Next Steps:</strong> {(player.actionable_next_steps ?? []).join(' ') || 'None listed.'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
