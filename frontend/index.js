// Record a visit to a project (food hub, lets play etc)
// Select family by id rather than name
// Create visit record and link to family
//
// v1.0	 22/5/23	Jerry Barnes
//
import { FormField, Input, ViewPicker, initializeBlock,useGlobalConfig, useSettingsButton, 
	useBase, useRecords, expandRecord, Button, TextButton, ViewportConstraint,
	Box,
    Heading,
    ViewPickerSynced,
    RecordCard,
    TablePickerSynced,
    FieldPickerSynced} from '@airtable/blocks/ui';
import React, { useState  } from "react"; 
import { FieldType } from '@airtable/blocks/models';

const GlobalConfigKeys = {
    FAMILY_TABLE_ID: 'familyTableId',
	FAMILY_ID_FIELD_ID: 'idFieldId',
	FAMILY_NAME_FIELD_ID: 'nameFieldId',
	FAMILY_ADDRESS_FIELD_ID: 'addressFieldId',
	FAMILY_POSTCODE_FIELD_ID: 'postcodeFieldId',
	FAMILY_PROJECT_FIELD_ID: 'projectFieldId',
    PAYMENT_TABLE_ID: 'paymentTableId',
    PAYMENT_FAMILY_LINK_FIELD_ID: 'linkFieldId',
	PAYMENT_DATE_FIELD_ID: 'dateFieldId',
};


function Payment() {
	
	const VIEWPORT_MIN_WIDTH = 345;
    const VIEWPORT_MIN_HEIGHT = 200;

    const base = useBase();

	
    const globalConfig = useGlobalConfig();
	
    // Read the user's choice for which table and views to use from globalConfig.
	// we need the family table, the payment table 
	// and the field on the payment table which links to family details plus
	// name and address fields from family and the payment date
	const familyTableId 	= globalConfig.get(GlobalConfigKeys.FAMILY_TABLE_ID);
    const paymentTableId 	= globalConfig.get(GlobalConfigKeys.PAYMENT_TABLE_ID);
    const linkFieldId 		= globalConfig.get(GlobalConfigKeys.PAYMENT_FAMILY_LINK_FIELD_ID);
    const dateFieldId 		= globalConfig.get(GlobalConfigKeys.PAYMENT_DATE_FIELD_ID);
    const idFieldId 		= globalConfig.get(GlobalConfigKeys.FAMILY_ID_FIELD_ID);
    const nameFieldId 		= globalConfig.get(GlobalConfigKeys.FAMILY_NAME_FIELD_ID);
    const addressFieldId 	= globalConfig.get(GlobalConfigKeys.FAMILY_ADDRESS_FIELD_ID);
    const postcodeFieldId 	= globalConfig.get(GlobalConfigKeys.FAMILY_POSTCODE_FIELD_ID);
    const projectFieldId 	= globalConfig.get(GlobalConfigKeys.FAMILY_PROJECT_FIELD_ID);


    const initialSetupDone = familyTableId && paymentTableId && linkFieldId  && nameFieldId && projectFieldId &&
							 dateFieldId && idFieldId && addressFieldId && postcodeFieldId ? true : false;

    // Use settings menu to hide away table pickers
    const [isShowingSettings, setIsShowingSettings] = useState(!initialSetupDone);
    useSettingsButton(function() {
        initialSetupDone && setIsShowingSettings(!isShowingSettings);
    });
	
    const familyTable = base.getTableByIdIfExists(familyTableId);
    const paymentTable = base.getTableByIdIfExists(paymentTableId);
		
	const linkField = paymentTable ? paymentTable.getFieldByIdIfExists(linkFieldId) : null;
	const dateField = paymentTable ? paymentTable.getFieldByIdIfExists(dateFieldId) : null;

	const idField 		= familyTable ? familyTable.getFieldByIdIfExists(idFieldId) : null;
	const nameField 	= familyTable ? familyTable.getFieldByIdIfExists(nameFieldId) : null;
	const addressField 	= familyTable ? familyTable.getFieldByIdIfExists(addressFieldId) : null;
	const postcodeField = familyTable ? familyTable.getFieldByIdIfExists(postcodeFieldId) : null;
	const projectField 	= familyTable ? familyTable.getFieldByIdIfExists(projectFieldId) : null;
	
	const [familyId, setFamilyId] = useState("");
	const [familyRecId, setFamilyRecId] = useState("");
	const [paymentRecId, setPaymentRecId] = useState("");
	
	const familyRecordset = useRecords(familyTable ? familyTable.selectRecords() : null);
	
	// the filter will find the family record matching the fieldid entered
	const familyRecords = familyRecordset ? familyRecordset.filter(family => {
			return (familyId.length > 0 && family.getCellValue(idField) == familyId)
		}) : null;
		
	const paymentRecordset = useRecords(paymentTable ? paymentTable.selectRecords() : null);

    // the filter will the payment record just created
	const paymentRecords = paymentRecordset ? paymentRecordset.filter(payment => {
			return payment.id ==  paymentRecId
		}) : null;
	
	if (paymentRecords && paymentRecords.length > 0 && !isShowingSettings) {expandRecord(paymentRecords[0]);setPaymentRecId(-1);}

	if (isShowingSettings) {
		if (paymentRecId != null){setPaymentRecId(null);}
        return (
            <ViewportConstraint minSize={{width: VIEWPORT_MIN_WIDTH, height: VIEWPORT_MIN_HEIGHT}}>
                <SettingsMenu
                    globalConfig={globalConfig}
                    base={base}
                    familyTable={familyTable}
                    paymentTable={paymentTable}
					linkField={linkField}
					dateField={dateField}
					idField={idField}
					nameField={nameField}
					addressField={addressField}
					postcodeField={postcodeField}
					projectField={projectField}
                    initialSetupDone={initialSetupDone}
                    onDoneClick={() => setIsShowingSettings(false)}
                />
            </ViewportConstraint>
        )
    } else {
			return (
				<div>
					<FormField label="Family number">
						<Input value={familyId} onChange={e => setIds(setFamilyId, e.target.value, setFamilyRecId, null)} />
					</FormField>			
					{familyRecords.map(record => (
						<li key={record.id}>
							<TextButton
								variant="dark"
								size="xlarge"
								onClick={() => {
									createPayment(paymentTable, linkFieldId, dateFieldId, record.id, setPaymentRecId);
								}}
								
							>
							{record.getCellValue(nameField)} ,
							</TextButton> 
							{record.getCellValue(addressField)} , {record.getCellValue(postcodeField)} ,
							{projectStatus(record.getCellValue(projectField))}
							
						</li>
					))}
					
				</div>		
			);
		
		
	}
}

function setIds(setter1, value1, setter2, value2){
	setter1(value1);
	setter2(value2);
}

function projectStatus(eligable){
	if (eligable){return "Registered";}
	return "Not Registered";
}

async function createPayment(tPayments, linkField, dateField, familyRecordId, setPaymentRecId){
	
	if (tPayments.hasPermissionToCreateRecord()) {
		
		const field = tPayments.getFieldById(dateField);
		var  newRecordId;
		if (field.type == FieldType.DATE_TIME ||
		    field.type == FieldType.DATE) {
		   
			//find the date to set in the record
			let now = new Date();

			newRecordId = await tPayments.createRecordAsync({
							[linkField]: [{id: familyRecordId}],
							[dateField]: now,
								});
		} else {
			newRecordId = await tPayments.createRecordAsync({
				[linkField]: [{id: familyRecordId}],
				});

		}
		// when the promise resolves to the id of the record created
		// save it so that when we restart the new record can be read
		// and displayed for update
		setPaymentRecId(newRecordId);
	}
}

function SettingsMenu(props) {

    const resetPaymentTableRelatedKeys = () => {
        props.globalConfig.setAsync(GlobalConfigKeys.FAMILY_TABLE_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.PAYMENT_FAMILY_LINK_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.PAYMENT_DATE_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.FAMILY_ID_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.FAMILY_NAME_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.FAMILY_ADDRESS_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.FAMILY_POSTCODE_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.FAMILY_PROJECT_FIELD_ID, '');
		
    };

    const getLinkedFamilyTable = () => {
        const linkFieldId = props.globalConfig.get(GlobalConfigKeys.PAYMENT_FAMILY_LINK_FIELD_ID);
        const paymentTableId = props.globalConfig.get(GlobalConfigKeys.PAYMENT_TABLE_ID);
        const paymentTable = props.base.getTableByIdIfExists(paymentTableId);

        const linkField = paymentTable.getFieldByIdIfExists(linkFieldId);
        const familyTableId = linkField.options.linkedTableId;

        props.globalConfig.setAsync(GlobalConfigKeys.FAMILY_TABLE_ID, familyTableId);
   };

    return(
        <div>
            <Heading margin={2}>
                Payment Settings
            </Heading>
            <Box marginX={2}>
                <FormField label="Which table holds the visit?">
                    <TablePickerSynced
                        globalConfigKey={GlobalConfigKeys.PAYMENT_TABLE_ID}
                        onChange={() => resetPaymentTableRelatedKeys()}
                        size="large"
                        maxWidth="350px"
                    />
                </FormField>
                {props.paymentTable &&
                    <div>
                        <Heading size="xsmall" variant="caps">{props.paymentTable.name} Fields:</Heading>
                        <Box display="flex" flexDirection="row">
                            <FormField label="Family link:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.paymentTable}
                                    globalConfigKey={GlobalConfigKeys.PAYMENT_FAMILY_LINK_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.MULTIPLE_RECORD_LINKS
                                    ]}
									onChange={() => getLinkedFamilyTable()}
                                />
                            </FormField>
							
                            <FormField label="Date:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.paymentTable}
                                    globalConfigKey={GlobalConfigKeys.PAYMENT_DATE_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.DATE_TIME,
										FieldType.DATE,
										FieldType.CREATED_TIME
                                    ]}
                                />
                            </FormField>
						</Box>
                    </div>
                }
				{props.familyTable &&
                    <div>
                        <Heading size="xsmall" variant="caps">{props.familyTable.name} Fields:</Heading>
                        <Box display="flex" flexDirection="row">
                            <FormField label="Family number:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.familyTable}
                                    globalConfigKey={GlobalConfigKeys.FAMILY_ID_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.NUMBER,
										FieldType.AUTO_NUMBER
                                    ]}
                                />
                            </FormField>
							<FormField label="Name:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.familyTable}
                                    globalConfigKey={GlobalConfigKeys.FAMILY_NAME_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.MULTILINE_TEXT,
										FieldType.SINGLE_LINE_TEXT
                                    ]}
                                />
                            </FormField>
							<FormField label="Address:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.familyTable}
                                    globalConfigKey={GlobalConfigKeys.FAMILY_ADDRESS_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.MULTILINE_TEXT,
										FieldType.SINGLE_LINE_TEXT
                                    ]}
                                />
                            </FormField>
                            <FormField label="Postcode:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.familyTable}
                                    globalConfigKey={GlobalConfigKeys.FAMILY_POSTCODE_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.SINGLE_LINE_TEXT
                                    ]}
                                />
                            </FormField>
                            <FormField label="Project:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.familyTable}
                                    globalConfigKey={GlobalConfigKeys.FAMILY_PROJECT_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.CHECKBOX
                                    ]}
                                />
                            </FormField>

                        </Box>
 
                    </div>
                }


                <Box display="flex" marginBottom={2}>
					<Button
						variant="primary"
						icon="check"
						marginLeft={2}
						disabled={!props.initialSetupDone}
						onClick={props.onDoneClick}
						alignSelf="right"
					>
						Done
					</Button>
				</Box>
			</Box>
		</div>
    );
}

initializeBlock(() => <Payment />);
