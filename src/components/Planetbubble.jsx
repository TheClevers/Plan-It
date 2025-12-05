export default function GalaxyView() {
  const planets = [
    {
      id: "mars",
      x: 200,
      y: 300,
      lastActivityTime: "2025-11-27T10:00:00Z",
      lastUpgradeTime: "2025-10-01T00:00:00Z",
      population: 12000,
      taskCountLast24h: 0,
      avgTaskTime: 15,
    },
    {
      id: "earth",
      x: 400,
      y: 450,
      lastActivityTime: new Date().toISOString(),
      lastUpgradeTime: "2025-12-01T00:00:00Z",
      population: 5000,
      taskCountLast24h: 5,
      avgTaskTime: 8,
    },
  ];

  const getMessage = (planet) => {
    const now = new Date();
    const minsSince = (now - new Date(planet.lastActivityTime)) / 1000 / 60;
    const daysSince = minsSince / 60 / 24;
    const daysSinceUpgrade = (now - new Date(planet.lastUpgradeTime)) / 1000 / 60 / 60 / 24;

    if (daysSince >= 7) return "🚨 지금 행성 관리가 안되고 있어!";
    if (minsSince <= 10) return "🌱 무럭무럭 자라는군!";
    if (planet.population > 10000) return "🏙 너무 좁아!";
    if (planet.taskCountLast24h === 0) return "😴 너무 조용해...";
    if (planet.avgTaskTime <= 10) return "🎉 생산성이 최고야!";
    if (daysSinceUpgrade >= 30) return "🔧 업그레이드가 필요해!";
    return null;
  };

  return (
    <div className="relative w-full h-screen bg-black">
      {planets.map((planet) => {
        const msg = getMessage(planet);

        return (
          <div key={planet.id}>
            {/* 행성 */}
            <img
              src="/planet.png"
              alt="planet"
              style={{
                position: "absolute",
                left: planet.x,
                top: planet.y,
                transform: "translate(-50%, -50%)",
                width: 60,
              }}
            />

            {/* 말풍선 */}
            {msg && (
              <div
                className="absolute text-sm text-black bg-white rounded px-3 py-2 shadow"
                style={{
                  top: planet.y - 50,
                  left: planet.x,
                  transform: "translate(-50%, -100%)",
                  whiteSpace: "nowrap",
                }}
              >
                {msg}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
