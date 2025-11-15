import type { CompletedTask } from "../types";

interface PlanetPosition {
  category: string;
  x: number;
  y: number;
}

interface PlanetInfoProps {
  category: string;
  completedTasks: CompletedTask[];
  planetPosition: PlanetPosition;
  planetSize: number;
}

export default function PlanetInfo({
  category,
  completedTasks,
  planetPosition,
  planetSize,
}: PlanetInfoProps) {
  // 행성 오른쪽에 표시 (공간이 부족하면 왼쪽)
  const offset = planetSize / 2 + 20;
  const tooltipWidth = 300;
  const tooltipHeight = Math.min(400, completedTasks.length * 80 + 100);

  return (
    <div
      className="absolute z-20"
      style={{
        left: `${offset}px`,
        top: "50%",
        transform: "translateY(-50%)",
      }}
    >
      <div
        className="bg-[#1a1a2e] rounded-xl p-5 shadow-2xl border border-[#16213e]"
        style={{
          width: `${tooltipWidth}px`,
          maxHeight: `${tooltipHeight}px`,
          overflowY: "auto",
        }}
      >
        <div className="mb-4 border-b border-gray-700 pb-3">
          <h2 className="m-0 text-white text-lg font-bold">{category}</h2>
        </div>

        <div>
          <h3 className="mb-3 text-[#4a90e2] text-sm font-semibold">
            완료한 일
          </h3>
          <div className="flex flex-col gap-2">
            {completedTasks.length === 0 ? (
              <p className="text-gray-500 text-center p-3 text-sm">
                아직 완료한 일이 없습니다.
              </p>
            ) : (
              completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 bg-[#16213e] rounded-md flex flex-col gap-1"
                >
                  <span className="text-xs text-gray-500">
                    {task.completedAt.toLocaleDateString()}
                  </span>
                  <span className="text-white text-sm">{task.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
