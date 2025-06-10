use serde::{Deserialize, Serialize};

/// Symptom features representing binary and continuous observations
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub enum Feature {
    Fever,
    SwollenGlands,
    Exudate,
    Cough,
    Rash,
    SoreThroat,
    Rhinorrhea,
    Headache,
    TonsilSwelling,
    LymphNodes,
    Tenderness,
    Onset,
    PANDAS,
    Irritability,
    Tics,
}

/// Possible diagnostic conditions
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub enum Condition {
    ViralPharyngitis,
    StrepThroat,
    InfectiousMono,
    ScarletFever,
    Covid19,
    AllergicRhinitis,
    Influenza,
    CommonCold,
}

/// Binary symptom fact (feature present or absent)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SymptomFact {
    pub feature: Feature,
    pub present: bool,
}

/// Continuous symptom value (for features with scale like fever magnitude)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ContinuousSymptom {
    pub feature: Feature,
    pub value: f32,
}

/// Complete patient observation with discrete and continuous symptoms
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PatientObservation {
    pub age: u8,
    pub contact_history: bool,
    pub discrete_symptoms: Vec<SymptomFact>,
    pub continuous_symptoms: Vec<ContinuousSymptom>,
}

/// Recommendation type based on probability thresholds
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Recommendation {
    TestForStrep,
    PrescribeAntibiotics,
    Watchful,
    ConsiderAlternatives,
    ReferSpecialist,
}

/// Complete differential diagnosis result
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DiagnosisResult {
    pub probabilities: std::collections::HashMap<Condition, f32>,
    pub log_odds: std::collections::HashMap<Condition, f32>,
    pub recommendation: Recommendation,
    pub message: String,
    pub explanation: String,
}
