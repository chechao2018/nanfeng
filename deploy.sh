#!/bin/bash

#-----------------------------------------------
AUTH="Authorization:Bearer $CF_API_TOKEN"
TYPE_FORMDATA="Content-Type:multipart/form-data"
TYPE_JSON="Content-Type:application/json"
FORM_FILE="$ENTRY=@dist/$ENTRY;type=application/javascript+module"
MAIN_MODULE='"main_module":"'$ENTRY'"'
PLACEMENT='"placement":{"mode":"smart"}'
#--------------------------
upload_worker(){
	local fMetadata='metadata={'$MAIN_MODULE,$PLACEMENT',"bindings":['$1']}'
	curl -X PUT -H "$AUTH" -H "$TYPE_FORMDATA" -F "$FORM_FILE" -F "$fMetadata" \
		$CF_SCRIPT_API/$workerName
}
put_script(){
	local fMetadata="metadata={$MAIN_MODULE}"
	curl -X PUT -H "$AUTH" -H "$TYPE_FORMDATA" -F "$FORM_FILE" -F "$fMetadata" \
		$CF_SCRIPT_API/$workerName/content
}
get_worker_settings(){
	curl -H "$AUTH" $CF_SCRIPT_API/$workerName/settings
}
patch_worker_settings(){
	local fSettings='settings={'$MAIN_MODULE,$PLACEMENT',"bindings":['$1']}'
	curl -X PATCH -H "$AUTH" -H "$TYPE_FORMDATA" -F "$fSettings" \
		$CF_SCRIPT_API/$workerName/settings
}
worker_subdomain_enabled(){
	curl -H "$AUTH" $CF_SERVICE_API/$workerName/environments/production/subdomain|grep 'enabled": true'
}
enable_worker_subdomain(){
	local data='{"enabled":true}'
	curl -X POST -H "$AUTH" -H "$TYPE_JSON" -d "$data" $CF_SCRIPT_API/$workerName/subdomain
}
page_deployment(){
	local qs="?page=1&per_page=1&sort_by=created_on&sort_order=desc&env=$CF_PAGE_ENV"
	local ret=`curl -H "$AUTH" "$CF_PROJECT_API/$pageName/deployments$qs"`
	post_handle "$ret" 'had_page_deployment'
	jq -r '.result' <<< $ret
}
create_page(){
	[ $pageBranch != main ] && local preview=',"preview_branch":"'$pageBranch'"'
	local data='{"name":"'$pageName'","production_branch":"main"'$preview'}'
	curl -X POST -H "$AUTH" -H "$TYPE_JSON" -d "$data" $CF_PROJECT_API
}
upload_page(){
	local fManifest='manifest={}' fBranch="branch=$pageBranch"
	curl -X POST -H "$AUTH" -H "$TYPE_FORMDATA" -F "$FORM_FILE" -F "$fManifest" -F "$fBranch" \
		$CF_PROJECT_API/$pageName/deployments
}
patch_page(){
	local data='{"deployment_configs":{"'$CF_PAGE_ENV'":{'$PLACEMENT,$1'}}}'
	curl -X PATCH -H "$AUTH" -H "$TYPE_JSON" -d "$data" $CF_PROJECT_API/$pageName
}
#-------------------
generate_bindings(){
	echo '{"type":"plain_text","name":"'$UUID'","text":"'$1'"},{"type":"kv_namespace","name":"'$KV'","namespace_id":"'$CF_NAMESPACE_ID'"}'
}
generate_configs(){
	echo '"env_vars":{"'$UUID'":{"type":"plain_text","value":"'$1'"}},"kv_namespaces":{"'$KV'":{"namespace_id":"'$CF_NAMESPACE_ID'"}}'
}
post_handle(){
	grep -qE 'success": ?false'<<< "$1" && echo $ret >&2 && return 1 || echo "$2 success" >> $GITHUB_STEP_SUMMARY
}
warn_no_uuid(){
	[ "$1" != "WORKER" ] && [ "$1" != "PAGE" ] && echo error $1 && return
	echo "Warning: $1 UUID is empty! you can set a repo secret named 'CF_${1}_UUID' or fill in cloudflare dashboard worker settings then try again" | tee -a $GITHUB_STEP_SUMMARY
}

[ ! -s "dist/$ENTRY" ] && echo "$ENTRY not found!" && exit 1;

deploy_worker(){
	#[ -z $workerName ] && echo "CF_WORKER_NAME is required!" && return;
	echo "deploy worker.." >> $GITHUB_STEP_SUMMARY

	if [ ! -z $CF_WORKER_UUID ]; then
		bindings=`generate_bindings $CF_WORKER_UUID`
		ret=`upload_worker $bindings`
		post_handle "$ret" 'upload_worker' || exit 1
	else
		ret=`put_script`
		post_handle "$ret" 'put_script' || exit 1
		ret=`get_worker_settings`
		nsid=`jq -r '.result.bindings[] | select(.name == "'$KV'") | .namespace_id' <<< $ret`
		uuid=`jq -r '.result.bindings[] | select(.name == "'$UUID'") | .text' <<< $ret`
		[ -z $uuid ] && warn_no_uuid WORKER
		if [ -z $nsid ] || [ $nsid != $CF_NAMESPACE_ID ]; then
			bindings=`generate_bindings $uuid`
			ret=`patch_worker_settings $bindings`
			post_handle "$ret" 'patch_worker_settings' || exit 1
		fi
	fi
	worker_subdomain_enabled || enable_worker_subdomain
}
deploy_page(){
	[ ! $deployPage ] && exit;
	[ -z $pageName ] && echo "CF_PAGE_NAME is required!" && exit 1;
	echo "deploy page.." >> $GITHUB_STEP_SUMMARY
	
	ret=`page_deployment`
	if [ "$ret" == null ]; then
		ret=`create_page`
		post_handle "$ret" 'create_page' || exit 1
		configs=`generate_configs $CF_PAGE_UUID $CF_NAMESPACE_ID`
	elif [ "$ret" == [] ]; then
		configs=`generate_configs $CF_PAGE_UUID $CF_NAMESPACE_ID`
	else
		uuid=`jq -r '.[0].env_vars.'$UUID'.value' <<< $ret`
		nsid=`jq -r '.[0].kv_namespaces.'$KV'.namespace_id' <<< $ret`
		if [ ! -z $CF_PAGE_UUID ] && [ "$uuid" != "$CF_PAGE_UUID" ]; then
			configs=`generate_configs $CF_PAGE_UUID $CF_NAMESPACE_ID`
		elif [ -z $nsid ] || [ $nsid != $CF_NAMESPACE_ID ]; then
			configs=`generate_configs $uuid $CF_NAMESPACE_ID`
		elif [ -z $uuid ]; then
			warn_no_uuid PAGE
		fi
	fi
	if [ ! -z $configs ]; then
		ret=`patch_page $configs`
		post_handle "$ret" 'patch_page' || exit 1
	fi
	ret=`upload_page`
	post_handle "$ret" 'upload_page' || exit 1
}
[ ! -z $workerName ] && deploy_worker || echo 'empty CF_WORKER_NAME'
[ "$deployPage" = false ] && echo 'no deploy page' && exit
[ ! -z $pageName ] && deploy_page || echo 'empty CF_PAGE_NAME'