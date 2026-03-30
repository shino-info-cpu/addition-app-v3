(function (global) {
  function createMasterDataBridge(options) {
    const state = options && options.state ? options.state : {};
    const getPrototypeDataSource = options && typeof options.getPrototypeDataSource === "function"
      ? options.getPrototypeDataSource
      : function fallbackGetPrototypeDataSource() {
          return {
            clients: [],
            organizations: [],
            services: [],
            staff: [],
            enrollments: [],
          };
        };
    const canUseApiRelations = options && typeof options.canUseApiRelations === "function"
      ? options.canUseApiRelations
      : function fallbackCanUseApiRelations() {
          return false;
        };
    const canUseApiJudgementContext = options && typeof options.canUseApiJudgementContext === "function"
      ? options.canUseApiJudgementContext
      : function fallbackCanUseApiJudgementContext() {
          return false;
        };

    function matchesServiceTargetScope(serviceTargetScope, clientTargetType) {
      if (!serviceTargetScope || !clientTargetType) {
        return true;
      }

      return serviceTargetScope === "児者" || serviceTargetScope === clientTargetType;
    }

    function isJudgementEligibleService(service) {
      if (!service) {
        return false;
      }

      return String(service.serviceCategory ?? "").trim() !== "相談支援";
    }

    function filterJudgementEligibleServicesForClient(client, services) {
      return Array.from(
        new Map(
          services
            .filter((service) => service
              && isJudgementEligibleService(service)
              && (
                !client?.targetType
                || !service.targetScope
                || matchesServiceTargetScope(service.targetScope, client.targetType)
              ))
            .map((service) => [service.serviceId, service])
        ).values()
      );
    }

    function getMasterClients() {
      return state.dataSource.clients === "api" ? state.masters.clients : getPrototypeDataSource().clients;
    }

    function getMasterOrganizations() {
      return state.dataSource.organizations === "api" ? state.masters.organizations : getPrototypeDataSource().organizations;
    }

    function getMasterServices() {
      return state.dataSource.services === "api" ? state.masters.services : getPrototypeDataSource().services;
    }

    function getJudgementClients() {
      return getMasterClients();
    }

    function getJudgementStaffs() {
      return state.dataSource.staffs === "api" ? state.masters.staffs : getPrototypeDataSource().staff;
    }

    function getClientById(clientId) {
      return getJudgementClients().find((item) => item.clientId === clientId) ?? getPrototypeDataSource().clients.find((item) => item.clientId === clientId);
    }

    function getOrganizationById(organizationId) {
      return getMasterOrganizations().find((item) => item.organizationId === organizationId) ?? getPrototypeDataSource().organizations.find((item) => item.organizationId === organizationId);
    }

    function getServiceById(serviceId) {
      return getMasterServices().find((item) => item.serviceId === serviceId) ?? getPrototypeDataSource().services.find((item) => item.serviceId === serviceId);
    }

    function getStaffById(staffId) {
      return getJudgementStaffs().find((item) => item.staffId === staffId) ?? getPrototypeDataSource().staff.find((item) => item.staffId === staffId);
    }

    function buildSampleOrganizationServices(organizationId) {
      const prototypeData = getPrototypeDataSource();
      const organization = prototypeData.organizations.find((item) => item.organizationId === organizationId);
      if (!organization) {
        return [];
      }

      return (organization.serviceIds ?? [])
        .map((serviceId) => {
          const service = prototypeData.services.find((item) => item.serviceId === serviceId);
          if (!service) {
            return null;
          }

          return {
            organizationServiceId: `${organization.organizationId}-${service.serviceId}`,
            organizationId: organization.organizationId,
            organizationName: organization.organizationName,
            serviceId: service.serviceId,
            serviceName: service.serviceName,
            serviceCategory: service.serviceCategory,
            targetScope: service.targetScope,
            constraintGroupCode: service.groupName,
            groupNames: service.groupName || "-",
          };
        })
        .filter(Boolean);
    }

    function buildSampleClientEnrollments(clientId) {
      const prototypeData = getPrototypeDataSource();
      return prototypeData.enrollments
        .filter((item) => item.clientId === clientId)
        .map((item) => {
          const client = prototypeData.clients.find((target) => target.clientId === item.clientId);
          const organization = prototypeData.organizations.find((target) => target.organizationId === item.organizationId);
          const service = prototypeData.services.find((target) => target.serviceId === item.serviceId);

          if (!client || !organization || !service) {
            return null;
          }

          return {
            clientEnrollmentId: item.enrollmentId,
            clientId: item.clientId,
            clientName: client.clientName,
            organizationServiceId: `${organization.organizationId}-${service.serviceId}`,
            organizationId: organization.organizationId,
            organizationName: organization.organizationName,
            serviceId: service.serviceId,
            serviceName: service.serviceName,
            serviceCategory: service.serviceCategory,
            serviceTargetScope: service.targetScope,
            serviceGroupId: "",
            groupName: service.groupName || "-",
            note: "",
          };
        })
        .filter(Boolean);
    }

    function getOrganizationServicesForOrganization(organizationId) {
      const normalizedOrganizationId = String(organizationId ?? "");
      if (!normalizedOrganizationId) {
        return [];
      }

      if (state.relations.organizationServicesByOrganizationId[normalizedOrganizationId]) {
        return state.relations.organizationServicesByOrganizationId[normalizedOrganizationId];
      }

      if (canUseApiRelations()) {
        return [];
      }

      return buildSampleOrganizationServices(normalizedOrganizationId);
    }

    function getClientEnrollmentRelations(clientId) {
      const normalizedClientId = String(clientId ?? "");
      if (!normalizedClientId) {
        return [];
      }

      if (state.relations.clientEnrollmentsByClientId[normalizedClientId]) {
        return state.relations.clientEnrollmentsByClientId[normalizedClientId];
      }

      if (canUseApiRelations()) {
        return [];
      }

      return buildSampleClientEnrollments(normalizedClientId);
    }

    function getClientEnrollments(clientId) {
      if (canUseApiJudgementContext() && state.dataSource.judgement === "api" && state.judgement.contextClientId === String(clientId)) {
        return state.judgement.enrollments;
      }
      return getPrototypeDataSource().enrollments.filter((item) => item.clientId === clientId);
    }

    function hasClientEnrollmentContext(clientId) {
      return getClientEnrollments(clientId).length > 0;
    }

    function getSelectableOrganizationsForJudgement(clientId) {
      const enrollments = getClientEnrollments(clientId);
      const client = getClientById(clientId);
      if (enrollments.length > 0) {
        const organizationIds = Array.from(new Set(enrollments.map((item) => item.organizationId)));
        return organizationIds
          .map(getOrganizationById)
          .filter(Boolean)
          .filter((organization) => {
            const serviceIds = enrollments
              .filter((item) => item.organizationId === organization.organizationId)
              .map((item) => item.serviceId);
            const services = filterJudgementEligibleServicesForClient(
              client,
              serviceIds.map(getServiceById),
            );
            return services.length > 0;
          });
      }

      return getMasterOrganizations().filter((organization) => {
        const organizationServices = getOrganizationServicesForOrganization(organization.organizationId);
        if (organizationServices.length > 0) {
          const services = filterJudgementEligibleServicesForClient(
            client,
            organizationServices.map((item) => getServiceById(item.serviceId)),
          );
          return services.length > 0;
        }

        return String(organization.organizationType ?? "").trim() !== "相談支援事業所";
      });
    }

    function getSelectableServicesForJudgement(clientId, organizationId) {
      const normalizedOrganizationId = String(organizationId ?? "");
      if (!normalizedOrganizationId) {
        return [];
      }

      const enrollments = getClientEnrollments(clientId);
      const client = getClientById(clientId);
      if (enrollments.length > 0) {
        const serviceIds = enrollments
          .filter((item) => item.organizationId === normalizedOrganizationId)
          .map((item) => item.serviceId);
        return filterJudgementEligibleServicesForClient(client, serviceIds.map(getServiceById));
      }

      const organizationServices = getOrganizationServicesForOrganization(normalizedOrganizationId);
      if (organizationServices.length > 0) {
        const organizationScopedServices = filterJudgementEligibleServicesForClient(
          client,
          organizationServices.map((item) => getServiceById(item.serviceId)),
        );

        if (organizationScopedServices.length > 0) {
          return organizationScopedServices;
        }
      }

      return filterJudgementEligibleServicesForClient(client, getMasterServices());
    }

    function getAvailableServiceDefinitionsForOrganization(organizationId) {
      if (!organizationId) {
        return [];
      }

      const registeredServiceIds = new Set(
        getOrganizationServicesForOrganization(organizationId).map((item) => item.serviceId),
      );

      const allServices = getMasterServices();
      const availableServices = allServices.filter((service) => !registeredServiceIds.has(service.serviceId));
      return availableServices.length > 0 ? availableServices : allServices;
    }

    function deriveResolvedOrganizationType(organization, service = null) {
      const explicitType = String(organization?.organizationType ?? "").trim();
      if (explicitType) {
        return explicitType;
      }

      const sourceTexts = [
        service?.serviceName,
        organization?.organizationName,
        organization?.serviceNames,
        ...(getOrganizationServicesForOrganization(String(organization?.organizationId ?? "")).map((item) => item.serviceName)),
      ]
        .filter(Boolean)
        .join(" / ");

      if (sourceTexts.includes("訪問看護") || sourceTexts.includes("訪看")) {
        return "訪問看護";
      }

      if (sourceTexts.includes("薬局")) {
        return "薬局";
      }

      if (
        sourceTexts.includes("病院")
        || sourceTexts.includes("診療所")
        || sourceTexts.includes("大学病院")
        || sourceTexts.includes("医療センター")
        || sourceTexts.includes("医大")
        || sourceTexts.includes("クリニック")
      ) {
        return "病院";
      }

      if (sourceTexts.includes("更生施設") || sourceTexts.includes("更生保護施設")) {
        return "更生施設";
      }

      if (
        sourceTexts.includes("児童自立支援施設")
        || sourceTexts.includes("児童養護施設")
        || sourceTexts.includes("児童心理治療施設")
        || sourceTexts.includes("乳児院")
        || sourceTexts.includes("児童施設")
      ) {
        return "児童施設";
      }

      if (
        sourceTexts.includes("刑事施設")
        || sourceTexts.includes("刑務所")
        || sourceTexts.includes("拘置所")
        || sourceTexts.includes("少年院")
        || sourceTexts.includes("少年鑑別所")
      ) {
        return "刑事施設";
      }

      if (
        sourceTexts.includes("障害者支援施設")
        || sourceTexts.includes("入所施設")
        || sourceTexts.includes("入所支援")
      ) {
        return "入所施設";
      }

      if (sourceTexts.includes("就業・生活支援センター") || sourceTexts.includes("就労支援センター")) {
        return "障害者就業・生活支援センター";
      }

      if (sourceTexts.includes("ケアマネ")) {
        return "ケアマネ事業所";
      }

      if (
        sourceTexts.includes("保育")
        || sourceTexts.includes("保育所")
        || sourceTexts.includes("保育園")
        || sourceTexts.includes("幼稚園")
        || sourceTexts.includes("認定こども園")
        || sourceTexts.includes("こども園")
      ) {
        return "保育";
      }

      if (sourceTexts.includes("学校")) {
        return "学校";
      }

      if (sourceTexts.includes("会社") || sourceTexts.includes("企業")) {
        return "企業";
      }

      return "";
    }

    function deriveOrganizationGroupFromType(organizationType) {
      return ["病院", "訪問看護", "薬局"].includes(organizationType)
        ? "病院・訪看・薬局グループ"
        : "福祉サービス等提供機関";
    }

    function getOrganizationGroupLabel(organization, service) {
      if (!organization) {
        return "";
      }

      if (organization.organizationGroup && organization.organizationGroup !== "福祉サービス等提供機関") {
        return organization.organizationGroup;
      }

      const resolvedType = deriveResolvedOrganizationType(organization, service);
      return deriveOrganizationGroupFromType(resolvedType);
    }

    function getDisplayOrganizationType(organization, service) {
      return deriveResolvedOrganizationType(organization, service) || "-";
    }

    function normalizeApiClient(item) {
      return {
        clientId: String(item.client_id ?? ""),
        clientCode: item.client_code ?? "",
        clientName: item.client_name ?? "",
        clientNameKana: item.client_name_kana ?? "",
        targetType: item.target_type ?? "",
      };
    }

    function normalizeApiOrganization(item) {
      const resolvedOrganizationType = deriveResolvedOrganizationType({
        organizationType: item.organization_type ?? "",
        organizationName: item.organization_name ?? "",
        serviceNames: item.service_names || "",
      });
      return {
        organizationId: String(item.organization_id ?? ""),
        organizationCode: item.organization_code ?? "",
        organizationName: item.organization_name ?? "",
        organizationType: resolvedOrganizationType,
        organizationGroup: deriveOrganizationGroupFromType(resolvedOrganizationType),
        groupNames: item.group_names || "-",
        serviceNames: item.service_names || "-",
      };
    }

    function normalizeApiService(item) {
      return {
        serviceId: String(item.service_definition_id ?? ""),
        serviceCode: item.service_code ?? "",
        serviceName: item.service_name ?? "",
        serviceCategory: item.service_category ?? "",
        targetScope: item.target_scope ?? item.target_type ?? "",
        groupName: item.constraint_group_code || "-",
      };
    }

    function normalizeApiStaff(item) {
      return {
        staffId: String(item.staff_id ?? ""),
        staffCode: item.staff_code ?? "",
        staffName: item.staff_name ?? "",
        email: item.email ?? "",
        homeOrganizationId: item.home_organization_id ? String(item.home_organization_id) : "",
        homeOrganizationName: item.home_organization_name || "-",
      };
    }

    function normalizeApiOrganizationService(item) {
      return {
        organizationServiceId: String(item.organization_service_id ?? ""),
        organizationId: String(item.organization_id ?? ""),
        organizationName: item.organization_name ?? "",
        serviceId: String(item.service_definition_id ?? ""),
        serviceCode: item.service_code ?? "",
        serviceName: item.service_name ?? "",
        serviceCategory: item.service_category ?? "",
        targetScope: item.target_scope ?? item.target_type ?? "",
        constraintGroupCode: item.constraint_group_code ?? "",
        groupNames: item.group_names || "-",
      };
    }

    function normalizeApiClientEnrollment(item) {
      return {
        clientEnrollmentId: String(item.client_enrollment_id ?? ""),
        clientId: String(item.client_id ?? ""),
        clientName: item.client_name ?? "",
        organizationServiceId: String(item.organization_service_id ?? ""),
        organizationId: String(item.organization_id ?? ""),
        organizationName: item.organization_name ?? "",
        serviceId: String(item.service_definition_id ?? ""),
        serviceName: item.service_name ?? "",
        serviceCategory: item.service_category ?? "",
        serviceTargetScope: item.service_target_scope ?? item.service_target_type ?? "",
        serviceGroupId: item.service_group_id ? String(item.service_group_id) : "",
        groupName: item.group_name || "-",
        note: item.note ?? "",
      };
    }

    function normalizeApiJudgementEnrollment(item) {
      const resolvedOrganizationType = deriveResolvedOrganizationType({
        organizationType: item.organization_type ?? "",
        organizationName: item.organization_name ?? "",
        serviceNames: item.service_name ?? "",
      });
      return {
        enrollmentId: String(item.client_enrollment_id ?? ""),
        clientId: String(item.client_id ?? ""),
        organizationId: String(item.organization_id ?? ""),
        organizationName: item.organization_name ?? "",
        organizationType: resolvedOrganizationType,
        organizationGroup: item.organization_group || deriveOrganizationGroupFromType(resolvedOrganizationType),
        serviceId: String(item.service_definition_id ?? ""),
        serviceName: item.service_name ?? "",
        serviceCategory: item.service_category ?? "",
        serviceTargetScope: item.service_target_scope ?? item.service_target_type ?? "",
        groupName: item.service_group_name || "-",
      };
    }

    return {
      normalizeApiClient,
      normalizeApiOrganization,
      normalizeApiService,
      normalizeApiStaff,
      normalizeApiOrganizationService,
      normalizeApiClientEnrollment,
      normalizeApiJudgementEnrollment,
      getMasterClients,
      getMasterOrganizations,
      getMasterServices,
      getJudgementClients,
      getJudgementStaffs,
      getClientById,
      getOrganizationById,
      getServiceById,
      getStaffById,
      buildSampleOrganizationServices,
      buildSampleClientEnrollments,
      matchesServiceTargetScope,
      isJudgementEligibleService,
      filterJudgementEligibleServicesForClient,
      getOrganizationServicesForOrganization,
      getClientEnrollmentRelations,
      getClientEnrollments,
      hasClientEnrollmentContext,
      getSelectableOrganizationsForJudgement,
      getSelectableServicesForJudgement,
      getAvailableServiceDefinitionsForOrganization,
      deriveResolvedOrganizationType,
      deriveOrganizationGroupFromType,
      getOrganizationGroupLabel,
      getDisplayOrganizationType,
    };
  }

  global.__KASAN_MASTER_DATA_BRIDGE__ = {
    createMasterDataBridge: createMasterDataBridge,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
