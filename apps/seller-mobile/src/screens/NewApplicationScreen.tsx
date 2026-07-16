import * as Contacts from "expo-contacts";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { automaticFinancingValues } from "../applicationDefaults";
import {
  ChoiceGroup,
  ErrorBanner,
  Field,
  LoadingState,
  PrimaryButton,
  SectionCard,
  SuccessBanner,
} from "../components/ui";
import { referenceAutofillFromContact } from "../contactAutofill";
import {
  createApplication,
  loadApplicationOptions,
  refreshAssessment,
  uploadApplicationDocuments,
  type ApplicationOptions,
  type PendingApplication,
} from "../services/applications";
import { colors } from "../theme";
import {
  emptyDocuments,
  initialApplicationForm,
  type ApplicationForm,
  type CapturedDocuments,
  type DocumentType,
} from "../types";
import { applicationSchema, firstValidationMessage } from "../validation";

const documentLabels: Readonly<Record<DocumentType, string>> = {
  dni_front: "DNI frontal",
  dni_back: "DNI posterior",
  selfie: "Selfie del cliente",
  address_proof: "Comprobante de domicilio",
};

const identityDocumentTypes = ["dni_front", "dni_back"] as const;
const supportingDocumentTypes = ["selfie", "address_proof"] as const;

const maritalChoices = [
  { value: "single", label: "Soltero(a)" },
  { value: "married", label: "Casado(a)" },
  { value: "union", label: "Unión libre" },
  { value: "other", label: "Otro" },
] as const;

const housingChoices = [
  { value: "owned", label: "Propia" },
  { value: "rented", label: "Alquilada" },
  { value: "family", label: "Familiar" },
] as const;

export function NewApplicationScreen({ userId }: { readonly userId: string }) {
  const [form, setForm] = useState<ApplicationForm>(initialApplicationForm);
  const [documents, setDocuments] = useState<CapturedDocuments>(emptyDocuments);
  const [options, setOptions] = useState<ApplicationOptions>({
    branches: [],
    devices: [],
    maximumTerm: null,
    minimumDownPaymentPercentage: null,
  });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingApplication, setPendingApplication] =
    useState<PendingApplication | null>(null);

  const update = <K extends keyof ApplicationForm>(
    field: K,
    value: ApplicationForm[K],
  ) => setForm((current) => ({ ...current, [field]: value }));

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const loaded = await loadApplicationOptions(userId);
      setOptions(loaded);
      setForm((current) => ({
        ...current,
        branchId: current.branchId || loaded.branches[0]?.id || "",
      }));
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron preparar las opciones de venta.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const availableDevices = useMemo(
    () =>
      options.devices.filter(
        (device) => !form.branchId || device.branchId === form.branchId,
      ),
    [form.branchId, options.devices],
  );

  const captureDocument = async (documentType: DocumentType) => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Autoriza el uso de la cámara para capturar el expediente.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      cameraType:
        documentType === "selfie"
          ? ImagePicker.CameraType.front
          : ImagePicker.CameraType.back,
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > 7 * 1024 * 1024) {
      setError(
        "La fotografía supera 7 MB. Reduce la calidad y vuelve a intentar.",
      );
      return;
    }
    setDocuments((current) => ({ ...current, [documentType]: asset }));
  };

  const pickReference = async (reference: "one" | "two") => {
    setError(null);
    try {
      if (!(await Contacts.isAvailableAsync())) {
        setError(
          "Los contactos no están disponibles en este dispositivo. Puedes completar la referencia manualmente.",
        );
        return;
      }
      if (Platform.OS === "android") {
        const permission = await Contacts.requestPermissionsAsync();
        if (!permission.granted) {
          setError(
            "No se autorizó el acceso a contactos. Puedes completar la referencia manualmente.",
          );
          return;
        }
      }

      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const selected = referenceAutofillFromContact(contact);
      if (!selected) {
        setError(
          "Ese contacto no tiene nombre ni teléfono. Completa la referencia manualmente.",
        );
        return;
      }

      setForm((current) =>
        reference === "one"
          ? {
              ...current,
              referenceOneName: selected.name || current.referenceOneName,
              referenceOnePhone: selected.phone || current.referenceOnePhone,
            }
          : {
              ...current,
              referenceTwoName: selected.name || current.referenceTwoName,
              referenceTwoPhone: selected.phone || current.referenceTwoPhone,
            },
      );
      if (!selected.name || !selected.phone) {
        setError(
          "Se cargaron los datos disponibles del contacto. Completa los campos faltantes y la relación manualmente.",
        );
      }
    } catch {
      setError(
        "No fue posible abrir los contactos. Puedes completar la referencia manualmente.",
      );
    }
  };

  const submit = async () => {
    const validation = applicationSchema.safeParse(form);
    if (!validation.success) {
      setError(firstValidationMessage(validation.error));
      return;
    }
    if (
      options.maximumTerm === null ||
      Number(form.term) > options.maximumTerm
    ) {
      setError(
        options.maximumTerm === null
          ? "No existe una configuración de crédito vigente."
          : `El plazo máximo vigente es de ${options.maximumTerm} meses.`,
      );
      return;
    }
    if (
      options.minimumDownPaymentPercentage !== null &&
      (Number(form.downPayment) * 100) / Number(form.requestedPrice) <
        options.minimumDownPaymentPercentage
    ) {
      setError(
        `La prima mínima vigente es ${options.minimumDownPaymentPercentage}% del precio.`,
      );
      return;
    }
    const missingDocument = (Object.keys(documents) as DocumentType[]).find(
      (documentType) => !documents[documentType],
    );
    if (missingDocument) {
      setError(`Captura ${documentLabels[missingDocument].toLowerCase()}.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    let application = pendingApplication;
    try {
      if (!application) {
        application = await createApplication(form);
        setPendingApplication(application);
      }
      await uploadApplicationDocuments(application, documents);
      await refreshAssessment(application.id);
      setSuccess(
        `Solicitud ${application.id.slice(0, 8).toUpperCase()} enviada a análisis.`,
      );
      setPendingApplication(null);
      setForm({
        ...initialApplicationForm,
        branchId: options.branches[0]?.id ?? "",
      });
      setDocuments(emptyDocuments);
      await loadOptions();
    } catch (submitError) {
      const prefix = application
        ? `La solicitud ${application.id.slice(0, 8).toUpperCase()} ya existe. `
        : "";
      setError(
        `${prefix}${
          submitError instanceof Error
            ? submitError.message
            : "No fue posible completar la solicitud."
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (optionsLoading && options.branches.length === 0) {
    return <LoadingState label="Preparando nueva solicitud…" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={styles.title}>
          Nueva solicitud
        </Text>
        <Text style={styles.copy}>
          Completa el expediente y envíalo a la mesa central de crédito.
        </Text>
        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner message={success} />}
        <SectionCard title="1. Identidad">
          <Text style={styles.muted}>
            Fotografía primero ambos lados de la identidad. Estas mismas
            imágenes quedarán guardadas en la solicitud; no tendrás que
            capturarlas otra vez al completar el expediente.
          </Text>
          {identityDocumentTypes.map((documentType) => (
            <DocumentCaptureRow
              assetUri={documents[documentType]?.uri}
              documentType={documentType}
              key={documentType}
              onCapture={() => void captureDocument(documentType)}
            />
          ))}
          <Text style={styles.subsectionTitle}>Datos del cliente</Text>
          <Field
            keyboardType="number-pad"
            label="DNI"
            onChangeText={(value) => update("dni", value)}
            value={form.dni}
          />
          <Field
            label="Nombres"
            onChangeText={(value) => update("firstName", value)}
            value={form.firstName}
          />
          <Field
            label="Apellidos"
            onChangeText={(value) => update("lastName", value)}
            value={form.lastName}
          />
          <Field
            keyboardType="phone-pad"
            label="Teléfono"
            onChangeText={(value) => update("phone", value)}
            value={form.phone}
          />
          <Field
            autoCapitalize="none"
            keyboardType="email-address"
            label="Correo"
            onChangeText={(value) => update("email", value)}
            optional
            value={form.email}
          />
          <Field
            label="Fecha de nacimiento (AAAA-MM-DD)"
            onChangeText={(value) => update("birthDate", value)}
            value={form.birthDate}
          />
          <ChoiceGroup
            choices={maritalChoices}
            label="Estado civil"
            onChange={(value) => update("maritalStatus", value)}
            value={form.maritalStatus}
          />
          <Field
            keyboardType="number-pad"
            label="Dependientes"
            onChangeText={(value) => update("dependents", value)}
            value={form.dependents}
          />
        </SectionCard>

        <SectionCard title="2. Domicilio e ingresos">
          <Field
            label="Dirección actual"
            multiline
            onChangeText={(value) => update("currentAddress", value)}
            value={form.currentAddress}
          />
          <ChoiceGroup
            choices={housingChoices}
            label="Tipo de vivienda"
            onChange={(value) => update("housingType", value)}
            value={form.housingType}
          />
          <Field
            label="Empresa o actividad económica"
            onChangeText={(value) => update("employerName", value)}
            value={form.employerName}
          />
          <Field
            label="Cargo u oficio"
            onChangeText={(value) => update("jobTitle", value)}
            optional
            value={form.jobTitle}
          />
          <Field
            keyboardType="number-pad"
            label="Antigüedad laboral (meses)"
            onChangeText={(value) => update("employmentMonths", value)}
            value={form.employmentMonths}
          />
          <Field
            keyboardType="decimal-pad"
            label="Ingreso mensual"
            onChangeText={(value) => update("monthlyIncome", value)}
            value={form.monthlyIncome}
          />
          <Field
            keyboardType="decimal-pad"
            label="Gastos mensuales"
            onChangeText={(value) => update("monthlyExpenses", value)}
            value={form.monthlyExpenses}
          />
        </SectionCard>

        <SectionCard title="3. Referencias">
          <Text style={styles.muted}>
            Puedes elegir cada referencia desde los contactos del teléfono. El
            nombre y el número se completan automáticamente; la relación se
            confirma manualmente.
          </Text>
          <PrimaryButton
            label="Elegir contacto para referencia 1"
            onPress={() => void pickReference("one")}
            secondary
          />
          <View style={styles.referenceFields}>
            <Field
              label="Referencia 1 · nombre"
              onChangeText={(value) => update("referenceOneName", value)}
              value={form.referenceOneName}
            />
            <Field
              keyboardType="phone-pad"
              label="Referencia 1 · teléfono"
              onChangeText={(value) => update("referenceOnePhone", value)}
              value={form.referenceOnePhone}
            />
            <Field
              label="Referencia 1 · relación"
              onChangeText={(value) =>
                update("referenceOneRelationship", value)
              }
              value={form.referenceOneRelationship}
            />
          </View>
          <PrimaryButton
            label="Elegir contacto para referencia 2"
            onPress={() => void pickReference("two")}
            secondary
          />
          <View style={styles.referenceFields}>
            <Field
              label="Referencia 2 · nombre"
              onChangeText={(value) => update("referenceTwoName", value)}
              value={form.referenceTwoName}
            />
            <Field
              keyboardType="phone-pad"
              label="Referencia 2 · teléfono"
              onChangeText={(value) => update("referenceTwoPhone", value)}
              value={form.referenceTwoPhone}
            />
            <Field
              label="Referencia 2 · relación"
              onChangeText={(value) =>
                update("referenceTwoRelationship", value)
              }
              value={form.referenceTwoRelationship}
            />
          </View>
        </SectionCard>

        <SectionCard title="4. Documentos restantes">
          <Text style={styles.muted}>
            Las fotos del DNI tomadas al inicio ya forman parte del expediente.
            Completa la selfie y el comprobante de domicilio. Máximo 7 MB por
            fotografía.
          </Text>
          {supportingDocumentTypes.map((documentType) => (
            <DocumentCaptureRow
              assetUri={documents[documentType]?.uri}
              documentType={documentType}
              key={documentType}
              onCapture={() => void captureDocument(documentType)}
            />
          ))}
        </SectionCard>

        <SectionCard title="5. Tienda, dispositivo y condiciones">
          <ChoiceGroup
            choices={options.branches.map((branch) => ({
              value: branch.id,
              label: branch.name,
            }))}
            label="Tienda"
            onChange={(branchId) => {
              setForm((current) => ({
                ...current,
                branchId,
                inventoryUnitId: "",
                requestedPrice: "",
                downPayment: "",
                term: "",
              }));
            }}
            value={form.branchId}
          />
          {availableDevices.length === 0 ? (
            <Text style={styles.muted}>
              No hay dispositivos disponibles en esta tienda.
            </Text>
          ) : (
            <View accessibilityRole="radiogroup" style={styles.deviceList}>
              <Text style={styles.fieldLabel}>Dispositivo disponible</Text>
              {availableDevices.map((device) => {
                const selected = device.id === form.inventoryUnitId;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={device.id}
                    onPress={() => {
                      const financing = automaticFinancingValues(
                        device.cashPrice,
                        options.minimumDownPaymentPercentage,
                        options.maximumTerm,
                      );
                      setForm((current) => ({
                        ...current,
                        inventoryUnitId: device.id,
                        ...financing,
                      }));
                    }}
                    style={[
                      styles.deviceOption,
                      selected && styles.deviceOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.deviceName,
                        selected && styles.deviceTextSelected,
                      ]}
                    >
                      {device.brand} {device.model} · L {device.cashPrice}
                    </Text>
                    <Text
                      style={[
                        styles.deviceDetail,
                        selected && styles.deviceTextSelected,
                      ]}
                    >
                      IMEI {device.imei} · {device.color} {device.storage}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Text style={styles.autoFillNote}>
            Al elegir un dispositivo se completan automáticamente el precio, la
            prima mínima vigente y el plazo configurado.
          </Text>
          <Field
            editable={false}
            keyboardType="decimal-pad"
            label="Precio financiado (automático)"
            onChangeText={(value) => update("requestedPrice", value)}
            value={form.requestedPrice}
          />
          <Field
            keyboardType="decimal-pad"
            label="Prima propuesta"
            onChangeText={(value) => update("downPayment", value)}
            value={form.downPayment}
          />
          <Field
            keyboardType="number-pad"
            label="Plazo propuesto (meses)"
            onChangeText={(value) => update("term", value)}
            value={form.term}
          />
          <Text style={styles.policyNote}>
            {options.maximumTerm === null
              ? "Configuración de crédito no disponible."
              : `Máximo ${options.maximumTerm} meses · prima mínima ${options.minimumDownPaymentPercentage ?? "por validar"}%.`}
          </Text>
        </SectionCard>

        <SectionCard title="6. Consentimientos">
          <ConsentRow
            label="El cliente autoriza el tratamiento de sus datos."
            onChange={(value) => update("consentDataProcessing", value)}
            value={form.consentDataProcessing}
          />
          <ConsentRow
            label="El cliente autoriza la evaluación crediticia."
            onChange={(value) => update("consentCreditReview", value)}
            value={form.consentCreditReview}
          />
        </SectionCard>

        {pendingApplication && (
          <Text style={styles.pendingNote}>
            Se reanudará el expediente{" "}
            {pendingApplication.id.slice(0, 8).toUpperCase()}; no se creará otra
            solicitud.
          </Text>
        )}
        <PrimaryButton
          disabled={availableDevices.length === 0 && !pendingApplication}
          label={
            pendingApplication ? "Reintentar expediente" : "Enviar a análisis"
          }
          loading={submitting}
          onPress={() => void submit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DocumentCaptureRow({
  documentType,
  assetUri,
  onCapture,
}: {
  readonly documentType: DocumentType;
  readonly assetUri?: string;
  readonly onCapture: () => void;
}) {
  return (
    <View style={styles.documentRow}>
      {assetUri ? (
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={`Vista previa de ${documentLabels[documentType]}`}
          source={{ uri: assetUri }}
          style={styles.documentPreview}
        />
      ) : null}
      <View style={styles.documentCopy}>
        <Text style={styles.fieldLabel}>{documentLabels[documentType]}</Text>
        <Text style={styles.documentStatus}>
          {assetUri ? "Fotografía lista" : "Pendiente de captura"}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`Capturar ${documentLabels[documentType]}`}
        accessibilityRole="button"
        onPress={onCapture}
        style={styles.cameraButton}
      >
        <Text style={styles.cameraButtonText}>
          {assetUri ? "Repetir" : "Tomar foto"}
        </Text>
      </Pressable>
    </View>
  );
}

function ConsentRow({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.consentRow}>
      <Text style={styles.consentText}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        onValueChange={onChange}
        thumbColor="#fff"
        trackColor={{ false: "#aab6b0", true: colors.brand }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  title: { color: colors.ink, fontSize: 25, fontWeight: "800" },
  copy: { color: colors.muted, lineHeight: 20, marginBottom: 18, marginTop: 5 },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  subsectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 12,
  },
  deviceList: { gap: 8, marginBottom: 16 },
  deviceOption: {
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  deviceOptionSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  deviceName: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  deviceDetail: { color: colors.muted, fontSize: 12, marginTop: 4 },
  deviceTextSelected: { color: "#fff" },
  documentRow: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 66,
    paddingVertical: 10,
  },
  documentCopy: { flex: 1 },
  documentStatus: { color: colors.muted, fontSize: 12, marginTop: 4 },
  documentPreview: { borderRadius: 8, height: 52, width: 52 },
  cameraButton: {
    alignItems: "center",
    backgroundColor: "#e7f4ef",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
  },
  cameraButtonText: { color: colors.brand, fontSize: 13, fontWeight: "800" },
  referenceFields: { marginTop: 14 },
  consentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  consentText: { color: colors.ink, flex: 1, fontSize: 14, lineHeight: 20 },
  pendingNote: {
    backgroundColor: "#fff8e7",
    borderRadius: 10,
    color: "#806b3d",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    padding: 12,
  },
  policyNote: {
    backgroundColor: "#e7f4ef",
    borderRadius: 10,
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    padding: 10,
  },
  autoFillNote: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
});
