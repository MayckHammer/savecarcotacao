interface ProgressStepsProps {
  currentStep: number;
  totalSteps?: number;
}

const stepLabels = ["Seus Dados", "Veículo", "Endereço"];

const ProgressSteps = ({ currentStep, totalSteps = 3 }: ProgressStepsProps) => {
  return (
    <div className="w-full px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div className={`flex-1 h-1 ${isCompleted || isActive ? "bg-primary" : "bg-muted"}`} />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "bg-accent text-accent-foreground ring-2 ring-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "✓" : `0${step}`}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`flex-1 h-1 ${isCompleted ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
              <span className={`text-xs mt-1 ${isActive || isCompleted ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {stepLabels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressSteps;
