import { PrintableBaquetonPlan } from "@/components/print/PrintableBaquetonPlan";
import { PrintableTrailerCanvasPlan } from "@/components/print/PrintableTrailerCanvasPlan";
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
    }
  | {
      type: "baqueton";
      input: BaquetonFormInput;
      result: BaquetonCalculationResult;
      settings: AppSettings;
    };

export function PrintablePlan(props: PrintablePlanProps) {
  const { settings } = props;

  return (
    <article className="print-landscape-sheet print-only-content mx-auto flex w-full max-w-[297mm] flex-col bg-white p-[6mm] text-black shadow-md print:max-w-none print:min-h-[210mm] print:p-0 print:shadow-none">
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
    </article>
  );
}

export type { PlanteamientoType };
