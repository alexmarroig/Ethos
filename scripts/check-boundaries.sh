#!/usr/bin/env bash
set -euo pipefail

mkdir -p reports

violations=0

CONTROL_IMPORTS=$(rg -n "from ['\"][^'\"]*(apps/ethos-clinic|apps/ethos-backend|ethos-clinic/src|ethos-backend/src)|require\(['\"][^'\"]*(apps/ethos-clinic|apps/ethos-backend|ethos-clinic/src|ethos-backend/src)" apps/ethos-control-plane/src || true)
if [[ -n "${CONTROL_IMPORTS}" ]]; then
  echo "❌ Control Plane não pode importar módulos do Clinical Plane." | tee -a reports/boundary-violations.log
  echo "${CONTROL_IMPORTS}" | tee -a reports/boundary-violations.log
  violations=1
fi

CLINIC_IMPORTS=$(rg -n "from ['\"][^'\"]*(apps/ethos-control-plane|ethos-control-plane/src)|require\(['\"][^'\"]*(apps/ethos-control-plane|ethos-control-plane/src)" apps/ethos-clinic/src || true)
if [[ -n "${CLINIC_IMPORTS}" ]]; then
  echo "❌ Clinical Plane não pode importar módulos do Control Plane." | tee -a reports/boundary-violations.log
  echo "${CLINIC_IMPORTS}" | tee -a reports/boundary-violations.log
  violations=1
fi

if [[ "${violations}" -eq 1 ]]; then
  exit 1
fi

echo "✅ Fronteiras de import entre Clinical Plane e Control Plane estão válidas." | tee reports/boundary-violations.log
