import { PrintableBaquetonPlan } from "@/components/print/PrintableBaquetonPlan";
import { PrintableTrailerCanvasPlan } from "@/components/print/PrintableTrailerCanvasPlan";
import { PrintWarnings } from "@/components/print/print-shared";
import type { ValidationIssue } from "@/lib/validation/planteamiento";
import type {
  AppSettings,
  BaquetonCalculationResult,
  BaquetonFormInput,
  LonaCalculationResult,
  LonaFormInput,
  PlanteamientoType,
} from "@/lib/types";

type PrintablePlanProps =
  | {
      type: "lona-remolque";
      input: LonaFormInput;
      result: LonaCalculationResult;
      settings: AppSettings;
      validationIssues: ValidationIssue[];
    }
  | {
      type: "baqueton";
      input: BaquetonFormInput;
      result: BaquetonCalculationResult;
      settings: AppSettings;
      validationIssues: ValidationIssue[];
    };

export function PrintablePlan(props: PrintablePlanProps) {
  const { validationIssues, settings } = props;

  return (
    <article className="print-landscape-sheet print-only-content mx-auto w-full max-w-[297mm] bg-white p-4 text-black shadow-md print:max-w-none print:p-0 print:shadow-none">
      <div className="no-print mb-3">
        <PrintWarnings issues={validationIssues} />
      </div>
      {props.type === "lona-remolque" ? (
        <PrintableTrailerCanvasPlan
          input={props.input}
          result={props.result}
          settings={settings}
        />
      ) : (
        <PrintableBaquetonPlan
          input={props.input}
          result={props.result}
          settings={settings}
        />
      )}
      <p className="print-break-avoid mt-2 text-right text-[8px] text-black/40">
        remolques-tgm · esquema no a escala real
      </p>
    </article>
  );
}

export type { PlanteamientoType };
